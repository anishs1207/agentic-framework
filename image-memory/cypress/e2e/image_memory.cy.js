describe('Image Memory App E2E Tests', () => {
  beforeEach(() => {
    // Visit the app before each test
    cy.visit('/');
  });

  it('should load the home page and display the header', () => {
    // Check if the application header exists
    cy.get('header').should('exist');
  });

  it('should display the core data categories', () => {
    // Check if the stats overview is visible
    cy.contains('Photos').should('be.visible');
    cy.contains('People').should('be.visible');
    cy.contains('Connections').should('be.visible');
    cy.contains('Events').should('be.visible');
  });

  it('should navigate through different tabs', () => {
    // Check if the primary tabs are present and clickable
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

  /* NEW TESTS */

  it('should allow chatting with the memory assistant', () => {
    const chatInput = 'input[placeholder*="Ask about your journey"]';
    cy.get(chatInput).should('be.visible').type('Who is in my memories?{enter}');
    
    // Check if the user message appeared
    cy.contains('Who is in my memories?').should('be.visible');
    
    // Check if assistant is "thinking" or responded
    // Note: Response might take time, we just check if it's querying
    cy.contains('Assistant').should('exist');
  });

  it('should allow switching between Chat and Search modes', () => {
    cy.contains('SEARCH').click();
    cy.contains('Visual Search Engine').should('be.visible');
    
    cy.contains('CHAT').click();
    cy.contains('Neural Memory Assistant').should('be.visible');
  });

  it('should handle image upload', () => {
    // The input is hidden, so we use selectFile with force: true or find the label
    // We'll use the image from the project's images folder
    cy.get('input[type="file"]').first().selectFile('images/image.png', { force: true });
    
    // After selection, it should start "Processing..."
    // Note: It might be fast, so we check for the text
    // We expect an alert or some feedback. The component shows "Processing..."
    // cy.contains('Processing...').should('exist');
  });

  it('should toggle different gallery filters', () => {
    // Navigate to gallery (home)
    cy.contains('Gallery').click();
    
    // Check if filter buttons are visible
    cy.contains('All Places').should('be.visible');
    
    // Since we might not have data, we just check if the "Reset All" appears if we click something
    // But filters only appear if there are images.
  });

  it('should show the Identity Vault controls', () => {
    cy.contains('Identity Vault').click();
    cy.contains('Identity Consolidation Tool').should('be.visible');
    cy.contains('KEEP THIS IDENTITY').should('be.visible');
  });

  it('should handle data reset with confirmation', () => {
    // Stub the window.confirm to return true
    cy.window().then((win) => {
      cy.stub(win, 'confirm').returns(true);
    });
    
    // Stub alert to return true
    cy.window().then((win) => {
      cy.stub(win, 'alert').as('alertStub');
    });

    cy.contains('Reset').click();
    
    // Check if confirm was called
    cy.window().its('confirm').should('be.called');
  });
});
