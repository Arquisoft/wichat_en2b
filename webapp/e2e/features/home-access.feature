Feature: Access the main page of the application

Scenario: The user has an account in the web
  Given A registered user
  When I fill the data in the login form
  Then I can see in the home page that the user profile is mine

Scenario: The user does not have an account in the web
  Given An unregistered user
  When I fill the data in the login form
  Then I can see a message asking me to create an account to access the application