// UI Tests with Cypress

describe('UI Tests', () => {
  it('Loads dashboard', () => {
    cy.visit('/dashboard');
    cy.contains('Search');
  });

  it('Onboarding wizard', () => {
    cy.visit('/onboarding');
    cy.get('input').type('Test Business');
    cy.contains('Next').click();
  });
});