/**
 * Script to set admin custom claim for a user
 * 
 * Usage:
 *   node set-admin.js <user-email-or-uid>
 * 
 * Example:
 *   node set-admin.js noahhurstboram@gmail.com
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdminClaim(emailOrUid) {
  try {
    // Try to get user by email first, then by UID
    let user;
    if (emailOrUid.includes('@')) {
      user = await admin.auth().getUserByEmail(emailOrUid);
    } else {
      user = await admin.auth().getUser(emailOrUid);
    }
    
    console.log(`Found user: ${user.email} (UID: ${user.uid})`);
    
    // Set custom claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    
    console.log(`✅ Admin claim set successfully for ${user.email}`);
    console.log('The user needs to sign out and sign back in for the claim to take effect.');
    
    // Verify the claim was set
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log('Custom claims:', updatedUser.customClaims);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting admin claim:', error.message);
    process.exit(1);
  }
}

// Get email/UID from command line argument
const emailOrUid = process.argv[2];

if (!emailOrUid) {
  console.error('Usage: node set-admin.js <user-email-or-uid>');
  console.error('Example: node set-admin.js noahhurstboram@gmail.com');
  process.exit(1);
}

setAdminClaim(emailOrUid);
