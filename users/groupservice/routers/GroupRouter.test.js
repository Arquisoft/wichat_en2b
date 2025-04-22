const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Mock del modelo Group
jest.mock('../group-model.js', () => {
  return jest.fn().mockImplementation(() => {
    return {
      groupName: '',
      owner: '',
      members: [],
      save: jest.fn().mockResolvedValue(true),
      validateSync: jest.fn().mockReturnValue(null)
    };
  });
});

// Instancia del modelo mock para poder cambiar sus métodos estáticos
const Group = require('../group-model.js');

// Mock del middleware verifyToken
jest.mock('../routers/auth.js', () => {
  return jest.fn((req, res, next) => {
    req.user = { _id: 'mockUserId' };
    next();
  });
});

// Importamos el router a testear
const GroupRouter = require('../routers/GroupRouter');

// Configuramos app de express para testing
const app = express();
app.use(bodyParser.json());
app.use(GroupRouter);

describe('Group Router Tests', () => {
  
  beforeEach(() => {
    // Limpiar todos los mocks antes de cada test
    jest.clearAllMocks();
    
    // Configurar métodos estáticos del modelo
    Group.find = jest.fn();
    Group.findOne = jest.fn();
    Group.findByIdAndDelete = jest.fn();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('GET /groups', () => {
    it('should return all groups', async () => {
      const mockGroups = [
        { groupName: 'Group1', owner: 'user1', members: ['user1'] },
        { groupName: 'Group2', owner: 'user2', members: ['user2', 'user3'] }
      ];
      
      Group.find.mockResolvedValue(mockGroups);

      const response = await request(app).get('/groups');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockGroups);
      expect(Group.find).toHaveBeenCalled();
    });

    it('should handle server errors', async () => {
      Group.find.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/groups');
      
      expect(response.status).toBe(500);
    });
  });

  describe('GET /groups/joined', () => {
    it('should return the group that the user is member of', async () => {
      const mockGroup = { 
        groupName: 'UserGroup', 
        owner: 'owner1', 
        members: ['mockUserId', 'user2'] 
      };
      
      Group.findOne.mockResolvedValue(mockGroup);

      const response = await request(app).get('/groups/joined');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockGroup);
      expect(Group.findOne).toHaveBeenCalledWith({ members: 'mockUserId' });
    });

    it('should return 204 if user is not in any group', async () => {
      Group.findOne.mockResolvedValue(null);

      const response = await request(app).get('/groups/joined');
      
      expect(response.status).toBe(204);
    });
  });

  describe('GET /groups/:name', () => {
    it('should find a group by name', async () => {
      const mockGroup = { 
        groupName: 'TestGroup', 
        owner: 'owner1', 
        members: ['user1', 'user2'] 
      };
      
      Group.findOne.mockResolvedValue(mockGroup);

      const response = await request(app).get('/groups/TestGroup');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockGroup);
      expect(Group.findOne).toHaveBeenCalledWith({ groupName: 'TestGroup' });
    });

    it('should return 204 if group not found', async () => {
      Group.findOne.mockResolvedValue(null);

      const response = await request(app).get('/groups/NonExistentGroup');
      
      expect(response.status).toBe(204);
    });
  });

  describe('POST /groups', () => {
    it('should create a new group successfully', async () => {
      // Mock para que no exista un grupo con el mismo nombre
      Group.findOne.mockImplementation((query) => {
        if (query.groupName) return null; // No group with this name
        if (query.members && query.members.$in) return null; // User is not in any group
        return null;
      });
  
      const mockGroup = {
        groupName: 'NewGroup',
        owner: 'mockUserId',
        members: ['mockUserId'],
        save: jest.fn().mockResolvedValue(true),
        validateSync: jest.fn().mockReturnValue(null)
      };
  
      // Mock del constructor del modelo
      Group.mockImplementation(() => mockGroup);
  
      const response = await request(app)
        .post('/groups')
        .send({ name: 'NewGroup' });
      
      // Verificar solo las propiedades que se esperan en la respuesta JSON
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        groupName: 'NewGroup',
        owner: 'mockUserId',
        members: ['mockUserId']
      });
      expect(mockGroup.save).toHaveBeenCalled();
    });

    it('should return 400 if empty request body', async () => {
      const response = await request(app)
        .post('/groups')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Request body is required' });
    });

    it('should return 400 if group already exists', async () => {
      const existingGroup = { groupName: 'ExistingGroup' };
      Group.findOne.mockImplementation((query) => {
        if (query.groupName === 'ExistingGroup') return existingGroup;
        return null;
      });

      const response = await request(app)
        .post('/groups')
        .send({ name: 'ExistingGroup' });
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Group already exists' });
    });

    it('should return 400 if user already belongs to a group', async () => {
      // Mock para que no exista un grupo con el mismo nombre
      Group.findOne.mockImplementation((query) => {
        if (query.groupName) return null;
        // User already belongs to another group
        if (query.members && query.members.$in) return { groupName: 'OtherGroup' };
        return null;
      });

      const response = await request(app)
        .post('/groups')
        .send({ name: 'NewGroup' });
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'User already belongs to a group' });
    });

    it('should handle validation errors', async () => {
      Group.findOne.mockResolvedValue(null); // No group exists

      const mockValidationError = {
        errors: { groupName: { message: 'Group name is required' } }
      };

      const mockGroup = {
        groupName: '',
        owner: 'mockUserId',
        members: ['mockUserId'],
        save: jest.fn(),
        validateSync: jest.fn().mockReturnValue(mockValidationError)
      };

      Group.mockImplementation(() => mockGroup);

      const response = await request(app)
        .post('/groups')
        .send({ name: '' });
      
      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /groups', () => {
    it('should update group name successfully', async () => {
      const mockGroup = {
        _id: 'groupId',
        groupName: 'OldName',
        owner: 'mockUserId',
        members: ['mockUserId'],
        save: jest.fn().mockResolvedValue(true)
      };

      // Mock para encontrar el grupo del usuario
      Group.findOne.mockImplementation((query) => {
        if (query.members && query.members.$in && query.members.$in.includes('mockUserId')) {
          return mockGroup;
        }
        if (query.groupName === 'NewName') return null; // No group with the new name
        return null;
      });

      const response = await request(app)
        .patch('/groups')
        .send({ name: 'NewName' });
      
      expect(response.status).toBe(200);
      expect(mockGroup.groupName).toBe('NewName');
      expect(mockGroup.save).toHaveBeenCalled();
    });

    it('should return 400 if no name is provided', async () => {
      const response = await request(app)
        .patch('/groups')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'New group name is required' });
    });

    it('should return 404 if group not found', async () => {
      Group.findOne.mockResolvedValue(null); // User is not in any group

      const response = await request(app)
        .patch('/groups')
        .send({ name: 'NewName' });
      
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Group not found' });
    });

    it('should return 403 if user is not the owner', async () => {
      const mockGroup = {
        groupName: 'GroupName',
        owner: 'anotherUserId', // Different from mockUserId
        members: ['mockUserId', 'anotherUserId']
      };

      Group.findOne.mockResolvedValue(mockGroup);

      const response = await request(app)
        .patch('/groups')
        .send({ name: 'NewName' });
      
      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Only the owner can modify the group' });
    });

    it('should return 400 if new name is the same as current name', async () => {
      const mockGroup = {
        groupName: 'CurrentName',
        owner: 'mockUserId',
        members: ['mockUserId']
      };

      Group.findOne.mockResolvedValue(mockGroup);

      const response = await request(app)
        .patch('/groups')
        .send({ name: 'CurrentName' });
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'New name must be different from the current one' });
    });

    it('should return 400 if group name already exists', async () => {
      const mockGroup = {
        groupName: 'CurrentName',
        owner: 'mockUserId',
        members: ['mockUserId']
      };

      Group.findOne.mockImplementation((query) => {
        if (query.members && query.members.$in) return mockGroup;
        if (query.groupName === 'ExistingName') return { groupName: 'ExistingName' };
        return null;
      });

      const response = await request(app)
        .patch('/groups')
        .send({ name: 'ExistingName' });
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Group name already exists' });
    });
  });

  describe('DELETE /groups', () => {
    it('should delete group successfully when user is owner', async () => {
      const mockGroup = {
        _id: 'groupId',
        groupName: 'GroupToDelete',
        owner: 'mockUserId',
        members: ['mockUserId']
      };

      Group.findOne.mockResolvedValue(mockGroup);
      Group.findByIdAndDelete.mockResolvedValue(mockGroup);

      const response = await request(app).delete('/groups');
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Group deleted successfully');
      expect(Group.findByIdAndDelete).toHaveBeenCalledWith('groupId');
    });

    it('should return 404 if group not found', async () => {
      Group.findOne.mockResolvedValue(null);

      const response = await request(app).delete('/groups');
      
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Group not found' });
    });

    it('should return 403 if user is not the owner', async () => {
      const mockGroup = {
        _id: 'groupId',
        groupName: 'GroupName',
        owner: 'anotherUserId', // Different from mockUserId
        members: ['mockUserId', 'anotherUserId']
      };

      Group.findOne.mockResolvedValue(mockGroup);

      const response = await request(app).delete('/groups');
      
      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Only the owner can delete the group' });
    });

    it('should handle deletion failure', async () => {
      const mockGroup = {
        _id: 'groupId',
        groupName: 'GroupName',
        owner: 'mockUserId',
        members: ['mockUserId']
      };

      Group.findOne.mockResolvedValue(mockGroup);
      Group.findByIdAndDelete.mockResolvedValue(null); // Deletion failed

      const response = await request(app).delete('/groups');
      
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Error deleting group' });
    });
  });

  describe('POST /groups/join', () => {
    it('should join a group successfully', async () => {
      const mockGroup = {
        groupName: 'GroupToJoin',
        owner: 'anotherUser',
        members: ['anotherUser'],
        save: jest.fn().mockResolvedValue(true)
      };

      // No group with the given name
      Group.findOne.mockImplementation((query) => {
        if (query.groupName === 'GroupToJoin') return mockGroup;
        // User is not in any group
        if (query.members && query.members.$in) return null;
        return null;
      });

      const response = await request(app)
        .post('/groups/join')
        .send({ name: 'GroupToJoin' });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Joined group successfully');
      expect(mockGroup.members).toContain('mockUserId');
      expect(mockGroup.save).toHaveBeenCalled();
    });

    it('should return 400 if no group name provided', async () => {
      const response = await request(app)
        .post('/groups/join')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Group name is required' });
    });

    it('should return 404 if group not found', async () => {
      Group.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/groups/join')
        .send({ name: 'NonExistentGroup' });
      
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Group not found' });
    });

    it('should return 400 if user already belongs to a group', async () => {
      // Mock para que exista tanto el grupo a unirse como que el usuario ya esté en otro grupo
      Group.findOne.mockImplementation((query) => {
        if (query.groupName) return { groupName: 'GroupToJoin', members: [] };
        if (query.members && query.members.$in) return { groupName: 'ExistingGroup', members: ['mockUserId'] };
        return null;
      });

      const response = await request(app)
        .post('/groups/join')
        .send({ name: 'GroupToJoin' });
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'User already belongs to a group' });
    });
  });

  describe('POST /groups/leave', () => {
    it('should leave the group successfully', async () => {
      // Creamos un mock con una implementación personalizada del método pull
      const mockMembers = ['mockUserId', 'anotherUser'];
      // Agregamos el método pull al array de miembros
      mockMembers.pull = jest.fn(function(userId) {
        const index = this.indexOf(userId);
        if (index !== -1) {
          this.splice(index, 1);
        }
        return this;
      });
  
      const mockGroup = {
        _id: 'group123',
        groupName: 'GroupToLeave',
        owner: 'anotherUser',
        members: mockMembers, // Usamos el array con el método pull
        save: jest.fn().mockResolvedValue(true)
      };
  
      // Mock findOne para devolver nuestro grupo personalizado
      Group.findOne = jest.fn().mockResolvedValue(mockGroup);
  
      const response = await request(app).post('/groups/leave');
      
      // Verificamos que la respuesta sea correcta
      expect(response.status).toBe(200);
      expect(mockGroup.members.pull).toHaveBeenCalledWith('mockUserId');
      expect(mockGroup.save).toHaveBeenCalled();
    });
  
    it('should return 400 if user does not belong to any group', async () => {
      Group.findOne = jest.fn().mockResolvedValue(null);
  
      const response = await request(app).post('/groups/leave');
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'User does not belong to any group' });
    });
  
    it('should handle server errors', async () => {
      // Este mock simula un error al buscar el grupo
      Group.findOne = jest.fn().mockRejectedValue(new Error('Database error'));
  
      const response = await request(app).post('/groups/leave');
      
      expect(response.status).toBe(500);
    });
  });
});