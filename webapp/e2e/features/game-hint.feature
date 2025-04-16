Feature: Interaction with the hint chat of a question

Scenario: The user interacts with the hint chat asking for help
  Given I am on the first question of a quiz
  When I ask for a hint about the question
  Then I should receive a hint related to the image and question without mentioning the answers provided