import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { db } from './firebase.js';
import { isSafaricomRequest } from './utils.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(bodyParser.json());

// Ping route
app.get('/', (req, res) => res.send('✅ M-PESA Callback Server Running'));

// Callback route
app.post('/mpesa-callback', async (req, res) => {
  console.log("📥 Incoming STK Callback:");
  console.log(JSON.stringify(req.body, null, 2));

  // Optional: Uncomment to enforce Safaricom-only callback source
  /*
  if (!isSafaricomRequest(req)) {
    console.log("❌ Unauthorized request attempt");
    return res.status(403).json({ message: "Forbidden" });
  }
  */

  const callback = req.body?.Body?.stkCallback;
  if (!callback) {
    console.log("❌ Invalid callback format");
    return res.status(400).json({ message: 'Bad payload' });
  }

  const resultCode = callback.ResultCode;
  const metadataItems = callback.CallbackMetadata?.Item || [];

  const phone = metadataItems.find(i => i.Name === 'PhoneNumber')?.Value;
  const amount = metadataItems.find(i => i.Name === 'Amount')?.Value;

  if (resultCode === 0 && phone && amount) {
    try {
      const userRef = db.collection('wallets').doc(phone.toString());
      const doc = await userRef.get();
      const currentBalance = doc.exists ? doc.data().balance || 0 : 0;

      await userRef.set({ balance: currentBalance + amount }, { merge: true });

      console.log(`✅ Updated wallet for ${phone}: +KES ${amount}`);
    } catch (e) {
      console.error('❌ Firestore error:', e.message);
    }
  } else {
    console.log("⚠️ Transaction not successful or missing details");
  }

  res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
});

// Catch-all route logger
app.use((req, res, next) => {
  console.log(`⚠️ Unknown route hit: ${req.method} ${req.originalUrl}`);
  next();
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
