import { test, expect } from '@playwright/test';

const BASE_URL = 'https://restful-booker.herokuapp.com';
let token: string;
let bookingId: number;

test.describe('Restful-Booker API Tests', () => {

  test.beforeAll(async ({ request }) => {
    // Generate Auth Token
    const authResponse = await request.post(`${BASE_URL}/auth`, {
      data: {
        username: "admin",
        password: "password123"
      }
    });
    const authBody = await authResponse.json();
    token = authBody.token;
  });

  test('CREATE a new booking (Happy Path)', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/booking`, {
      data: {
        firstname: "Jim",
        lastname: "Brown",
        totalprice: 111,
        depositpaid: true,
        bookingdates: {
          checkin: "2026-01-01",
          checkout: "2026-01-05"
        },
        additionalneeds: "Breakfast"
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.booking).toHaveProperty('firstname', 'Jim');
    bookingId = body.bookingid; // Save ID for subsequent tests
  });

  test('READ an existing booking (Happy Path)', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/booking/${bookingId}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('lastname', 'Brown');
  });

  test('UPDATE a booking using Auth Token (Happy Path)', async ({ request }) => {
    const response = await request.put(`${BASE_URL}/booking/${bookingId}`, {
      headers: {
        'Cookie': `token=${token}`,
        'Accept': 'application/json'
      },
      data: {
        firstname: "James",
        lastname: "Brown",
        totalprice: 150,
        depositpaid: false,
        bookingdates: {
          checkin: "2026-01-01",
          checkout: "2026-01-05"
        },
        additionalneeds: "Dinner"
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('firstname', 'James');
  });

  test('UPDATE a booking WITHOUT Auth Token (Unhappy Path)', async ({ request }) => {
    const response = await request.put(`${BASE_URL}/booking/${bookingId}`, {
      data: {
        firstname: "Hacker",
        lastname: "Man",
        totalprice: 999,
        depositpaid: true,
        bookingdates: {
          checkin: "2026-01-01",
          checkout: "2026-01-05"
        },
        additionalneeds: "None"
      }
    });
    
    // Expecting 403 Forbidden because there is no auth token in headers
    expect(response.status()).toBe(403);
  });

  test('DELETE a booking (Happy Path)', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/booking/${bookingId}`, {
      headers: {
        'Cookie': `token=${token}`
      }
    });
    expect(response.status()).toBe(201); // Restful-booker returns 201 Created on delete
    
    // Verify deletion
    const getResponse = await request.get(`${BASE_URL}/booking/${bookingId}`);
    expect(getResponse.status()).toBe(404);
  });
});