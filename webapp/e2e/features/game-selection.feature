Feature: Selecting a quiz subject

Scenario: The user selects a subject for the quiz and starts playing
  Given I am logged in
  When I choose a subject from the available list
  Then I should see questions related to the selected subject