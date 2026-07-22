# QA Automation Assessment

This repository contains an automated test suite targeting the Swag Labs Web UI and the Restful-Booker API. 

## How to Install and Run the Suite

**Prerequisites:** Node.js (v18+) installed on your machine.

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/bernsbayani/executiveassist-assessment.git](https://github.com/bernsbayani/executiveassist-assessment.git)
   cd executiveassist-assessment



Tooling Choices
I chose Playwright (using TypeScript) for this assessment.

Unified Ecosystem: Playwright excels at both UI and API testing. Keeping both layers in a single framework reduces context switching, simplifies the CI/CD pipeline setup, and avoids the need to maintain separate toolchains (e.g., Selenium for UI and Postman for API).

Reliability: Its auto-wait capabilities drastically reduce the flakiness commonly associated with UI testing.

Speed: It runs tests in parallel by default and operates out-of-process, making it exceptionally fast.

Test Strategy: UI Layer vs. API Layer
The UI Layer (Swag Labs):
The UI suite is kept lightweight and focused solely on critical user journeys and client-side interactions. I tested the standard user login/checkout flow (happy path) and a locked-out user login attempt (unhappy path) to ensure the client-side error messaging renders correctly.

The API Layer (Restful-Booker):
I pushed the bulk of the data manipulation and state validation to the API layer. The API suite handles full CRUD operations (Create, Read, Update, Delete). API tests are inherently faster, less brittle, and more reliable than UI tests. Validating business logic—such as ensuring a booking cannot be updated without a valid authentication token (negative test)—belongs here, preventing bloated and slow UI test suites.

Future Enhancements (With More Time)
If given more time, I would expand this framework by adding:

CI/CD Integration: Integrate GitHub Actions or GitLab CI to trigger runs on pull requests and deployments.

Data-Driven Testing: Parameterize the UI tests to loop through multiple user roles (e.g., standard_user, problem_user, performance_glitch_user) without duplicating code.

Environment Management: Implement .env files to easily toggle between staging, QA, and production URLs.

Visual Regression Testing: Add snapshot assertions for critical UI components (like the checkout cart) to catch unintended CSS changes.

Page Object Model (POM): Refactor the UI tests into a structured POM to improve maintainability as the suite scales.

AI Tooling Usage
For this assessment, I utilized Cursor AI.

What I accepted: I used it to generate the initial boilerplate playwright.config.ts file and scaffold the describe blocks for the RESTful API endpoints.

What I corrected/rewrote: The AI initially generated basic CSS selectors for the UI tests. I rewrote these to use Playwright's user-facing locators (e.g., getByRole, getByText) to make the tests more resilient to DOM changes and better aligned with accessibility standards. I also manually structured the API authentication flow to properly extract and pass the token between tests using a beforeAll hook, as the AI generated isolated, non-sequential tests that would have failed on the Update/Delete steps.