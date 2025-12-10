#!/bin/bash
# Quick script to set admin claim using Firebase CLI

echo "Setting admin claim for user..."
echo "Your Firebase UID: kdWm2MNPK1eN8GqEt8AOgjWCw8P2"
echo ""

firebase functions:shell << 'SHELL'
admin.auth().setCustomUserClaims('kdWm2MNPK1eN8GqEt8AOgjWCw8P2', { admin: true }).then(() => {
  console.log('Admin claim set successfully!');
  process.exit(0);
});
SHELL

echo ""
echo "✅ Done! Sign out and sign back in for the claim to take effect."
