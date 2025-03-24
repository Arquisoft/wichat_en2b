Feature: Viewing user's game history

Scenario: The user wants to see the Profile statistics
  Given I am logged in
  When I navigate to the "Statistics" section
  Then I should see a list of games I have played, including passed and failed questions, times, and scores
