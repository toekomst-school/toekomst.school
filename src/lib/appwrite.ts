import { Client, Account } from 'appwrite';

export const appwrite = new Client()
  .setEndpoint('https://write.toekomst.school/v1') // Your Appwrite endpoint
  .setProject('toekomstschool'); // Replace with your Appwrite project ID

export const account = new Account(appwrite); 