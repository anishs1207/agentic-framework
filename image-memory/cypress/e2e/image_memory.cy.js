describe('Image Memory App E2E Tests', () => {
  beforeEach(() => {
    // Visit the app before each test
    cy.visit('/');
  });

  it('should load the home page and display the header', () => {
    // Check if the application header exists
    // Based on src/app/page.tsx, Header component is rendered
    cy.get('header').should('exist');
  });

  it('should display the core data categories', () => {
    // Check if the stats overview is visible
    // They are in a grid with 4 columns
    cy.contains('Photos').should('be.visible');
    cy.contains('People').should('be.visible');
    cy.contains('Connections').should('be.visible');
    cy.contains('Events').should('be.visible');
  });

  it('should navigate through different tabs', () => {
    // Check if the primary tabs are present and clickable
    // Note: Some tabs currently share the same label in the UI
    const tabLabels = ['Gallery', 'Identity Vault', 'Network Explorer', 'Timeline'];
    
    tabLabels.forEach(label => {
        cy.contains(label).click().should('be.visible');
    });
  });

  it('should show the search section', () => {
    // Check if the search input is available
    cy.get('input[placeholder*="search"]').should('exist');
  });

  it('should have a functional sync button', () => {
    // Check if the sync button exists and can be clicked
    cy.contains('Sync').should('be.visible').click();
  });

  it('should have a reset button', () => {
    // Check if the reset button is visible
    cy.contains('Reset').should('be.visible');
  });
});
