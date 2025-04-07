Feature: Answering a question

Scenario: The user answers a question correctly
  Given I am on the first question of a quiz
  When I select the correct answer for the question
  Then I should see a confirmation message that I answered correctly and my score should be updated

Scenario: The user answers a question incorrectly
  Given I am on the first question of a game
  When I select an incorrect answer for the question
  Then I should see a message indicating the correct answer and my score should not be updated