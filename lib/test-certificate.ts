import { prisma } from './prisma';

// Test to see if certificate field is available
async function testCertificate() {
  try {
    const certificate = await prisma.certificate.findFirst();
    console.log('Certificate model is available:', certificate);
  } catch (error) {
    console.error('Certificate model test failed:', error);
  }
}

export { testCertificate };
