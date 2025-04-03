Feature: Registering a new user

//Scenario: The user is not registered in the site
//  Given An unregistered user
//  When I fill the data in the form and press submit
//  Then A confirmation message should be shown in the screen

Scenario: The user is already registered in the site
  Given An already registered user
  When I fill the register data in the form and press submit
  Then A error message should inform me that the account is already registered