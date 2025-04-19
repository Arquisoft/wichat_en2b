import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GroupPage from '../components/home/ui/GroupPage';
import axios from 'axios';
import { getAuthToken, getCurrentPlayerId } from '@/utils/auth';

// Mock de módulos y funciones externas
jest.mock('axios');
jest.mock('@/utils/auth', () => ({
  getAuthToken: jest.fn(() => 'mock-token'),
  getCurrentPlayerId: jest.fn(() => Promise.resolve('mockUserId'))
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock para document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: 'token=mock-token',
});

describe('GroupPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentPlayerId.mockResolvedValue('mockUserId');
  });
  
  // Test para cuando el usuario no está en un grupo
  test('renders "not part of any group" message when user has no group', async () => {
    // Configurar respuesta del endpoint para indicar que no hay grupo
    axios.get.mockImplementation((url) => {
      if (url.includes('/groups/joined')) {
        return Promise.reject({ response: { status: 404 } });
      }
      return Promise.resolve({ data: [] });
    });

    render(<GroupPage />);

    // Verificar que se muestra el mensaje
    await waitFor(() => {
      expect(screen.getByText('You are not part of any group!')).toBeInTheDocument();
    });
    
    // Verificar que los tabs de crear y unirse están presentes
    expect(screen.getByText('Join')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  // Test para crear un grupo
  test('allows user to create a group', async () => {
    // Mock para la búsqueda de grupo (no existe) y la creación
    axios.get.mockImplementation((url) => {
      if (url.includes('/groups/joined')) {
        return Promise.reject({ response: { status: 404 } });
      }
      if (url.includes('/groups/NewGroup')) {
        return Promise.reject({ response: { status: 404 } });
      }
      return Promise.resolve({ data: null });
    });
    
    axios.post.mockResolvedValue({ status: 200, data: { groupName: 'NewGroup' } });
    
    // Simular reload
    const originalLocation = window.location;
    delete window.location;
    window.location = { reload: jest.fn() };

    render(<GroupPage />);

    // Cambiar a la pestaña de creación
    await waitFor(() => {
      fireEvent.click(screen.getByText('Create'));
    });

    // Introducir nombre del grupo
    const input = screen.getByLabelText('Group Name');
    fireEvent.change(input, { target: { value: 'NewGroup' } });

    // El botón debería estar habilitado
    await waitFor(() => {
      const createButton = screen.getByText('Create Group');
      expect(createButton).not.toBeDisabled();
      fireEvent.click(createButton);
    });

    // Verificar que se llamó al endpoint correcto
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/groups'),
        { name: 'NewGroup' },
        expect.any(Object)
      );
    });

    // Restaurar window.location
    window.location = originalLocation;
  });

  // Test para unirse a un grupo
  test('allows user to join a group', async () => {
    // Mock para la búsqueda de grupo (existe) y la unión
    axios.get.mockImplementation((url) => {
      if (url.includes('/groups/joined')) {
        return Promise.reject({ response: { status: 404 } });
      }
      if (url.includes('/groups/ExistingGroup')) {
        return Promise.resolve({ data: { groupName: 'ExistingGroup' } });
      }
      return Promise.resolve({ data: null });
    });
    
    axios.post.mockResolvedValue({ status: 200, data: { groupName: 'ExistingGroup' } });
    
    // Simular reload
    const originalLocation = window.location;
    delete window.location;
    window.location = { reload: jest.fn() };

    render(<GroupPage />);

    // La pestaña "Join" debería estar seleccionada por defecto
    const input = screen.getByLabelText('Group Name');
    fireEvent.change(input, { target: { value: 'ExistingGroup' } });

    // El botón debería estar habilitado
    await waitFor(() => {
      const joinButton = screen.getByText('Join Group');
      expect(joinButton).not.toBeDisabled();
      fireEvent.click(joinButton);
    });

    // Verificar que se llamó al endpoint correcto
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/groups/join'),
        { name: 'ExistingGroup' },
        expect.any(Object)
      );
    });

    // Restaurar window.location
    window.location = originalLocation;
  });

  // Test para cuando el usuario está en un grupo
  test('displays group info when user is in a group', async () => {
    const mockGroup = {
      groupName: 'TestGroup',
      owner: 'mockUserId',
      members: ['mockUserId', 'userId2']
    };

    const mockMembers = [
      { _id: 'mockUserId', username: 'testuser' },
      { _id: 'userId2', username: 'otheruser' }
    ];

    // Mocks para los endpoints
    axios.get.mockImplementation((url) => {
      if (url.includes('/groups/joined')) {
        return Promise.resolve({ data: mockGroup });
      }
      return Promise.resolve({ data: [] });
    });

    axios.post.mockImplementation((url) => {
      if (url.includes('/users/by-ids')) {
        return Promise.resolve({ data: mockMembers });
      }
      return Promise.resolve({ data: {} });
    });

    render(<GroupPage />);

    // Verificar que se muestra la información del grupo
    await waitFor(() => {
      expect(screen.getByText('Your group')).toBeInTheDocument();
      expect(screen.getByText('Name: TestGroup')).toBeInTheDocument();
      expect(screen.getByText('Owner: testuser (You)')).toBeInTheDocument();
      expect(screen.getByText('testuser (You)')).toBeInTheDocument();
      expect(screen.getByText('otheruser')).toBeInTheDocument();
    });

    // Verificar que se muestran los botones de acciones
    expect(screen.getByText('Leave Group')).toBeInTheDocument();
    expect(screen.getByText('Delete Group')).toBeInTheDocument(); // Solo visible para el propietario
  });

  // Test para salir de un grupo
  test('allows user to leave a group', async () => {
    const mockGroup = {
      groupName: 'TestGroup',
      owner: 'anotherUserId',
      members: ['mockUserId', 'anotherUserId']
    };

    const mockMembers = [
      { _id: 'mockUserId', username: 'testuser' },
      { _id: 'anotherUserId', username: 'groupowner' }
    ];

    // Mocks para los endpoints
    axios.get.mockImplementation((url) => {
      if (url.includes('/groups/joined')) {
        return Promise.resolve({ data: mockGroup });
      }
      return Promise.resolve({ data: [] });
    });

    axios.post.mockImplementation((url, data, config) => {
      if (url.includes('/users/by-ids')) {
        return Promise.resolve({ data: mockMembers });
      }
      if (url.includes('/groups/leave')) {
        return Promise.resolve({ status: 200, data: { message: 'Left the group successfully' } });
      }
      return Promise.resolve({ data: {} });
    });

    // Simular reload
    const originalLocation = window.location;
    delete window.location;
    window.location = { reload: jest.fn() };

    render(<GroupPage />);

    // Esperar a que se cargue la información del grupo
    await waitFor(() => {
      expect(screen.getByText('Your group')).toBeInTheDocument();
    });

    // Hacer clic en el botón de salir
    fireEvent.click(screen.getByText('Leave Group'));

    // Verificar que se llamó al endpoint correcto
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/groups/leave'),
        {},
        expect.any(Object)
      );
    });

    // Restaurar window.location
    window.location = originalLocation;
  });

  // Test para modificar el nombre del grupo (solo para el propietario)
  test('allows owner to modify group name', async () => {
    const mockGroup = {
      groupName: 'TestGroup',
      owner: 'mockUserId',
      members: ['mockUserId', 'userId2']
    };

    const mockMembers = [
      { _id: 'mockUserId', username: 'testuser' },
      { _id: 'userId2', username: 'otheruser' }
    ];

    // Mocks para los endpoints
    axios.get.mockImplementation((url) => {
      if (url.includes('/groups/joined')) {
        return Promise.resolve({ data: mockGroup });
      }
      return Promise.resolve({ data: null });
    });

    axios.post.mockImplementation((url) => {
      if (url.includes('/users/by-ids')) {
        return Promise.resolve({ data: mockMembers });
      }
      return Promise.resolve({ data: {} });
    });

    axios.patch.mockResolvedValue({ status: 200, data: { message: 'Group name updated successfully' } });

    // Simular reload
    const originalLocation = window.location;
    delete window.location;
    window.location = { reload: jest.fn() };

    render(<GroupPage />);

    // Esperar a que se cargue la información del grupo
    await waitFor(() => {
      expect(screen.getByText('Your group')).toBeInTheDocument();
    });

    // Introducir nuevo nombre de grupo
    const input = screen.getByLabelText('Change group name');
    fireEvent.change(input, { target: { value: 'NewGroupName' } });

    // Hacer clic en el botón para modificar
    await waitFor(() => {
      const modifyButton = screen.getByText('Modify group');
      expect(modifyButton).not.toBeDisabled();
      fireEvent.click(modifyButton);
    });

    // Verificar que se llamó al endpoint correcto
    await waitFor(() => {
      expect(axios.patch).toHaveBeenCalledWith(
        expect.stringContaining('/groups'),
        { name: 'NewGroupName' },
        expect.any(Object)
      );
    });

    // Restaurar window.location
    window.location = originalLocation;
  });

  // Test para eliminar un grupo (solo para el propietario)
  test('allows owner to delete the group', async () => {
    const mockGroup = {
      groupName: 'TestGroup',
      owner: 'mockUserId',
      members: ['mockUserId']
    };

    const mockMembers = [
      { _id: 'mockUserId', username: 'testuser' }
    ];

    // Mocks para los endpoints
    axios.get.mockImplementation((url) => {
      if (url.includes('/groups/joined')) {
        return Promise.resolve({ data: mockGroup });
      }
      return Promise.resolve({ data: null });
    });

    axios.post.mockImplementation((url) => {
      if (url.includes('/users/by-ids')) {
        return Promise.resolve({ data: mockMembers });
      }
      return Promise.resolve({ data: {} });
    });

    axios.delete.mockResolvedValue({ status: 200, data: { message: 'Group deleted successfully' } });

    // Simular reload
    const originalLocation = window.location;
    delete window.location;
    window.location = { reload: jest.fn() };

    render(<GroupPage />);

    // Esperar a que se cargue la información del grupo
    await waitFor(() => {
      expect(screen.getByText('Your group')).toBeInTheDocument();
    });

    // Hacer clic en el botón para eliminar
    fireEvent.click(screen.getByText('Delete Group'));

    // Verificar que se llamó al endpoint correcto
    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/groups'),
        expect.any(Object)
      );
    });

    // Restaurar window.location
    window.location = originalLocation;
  });
});