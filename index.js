import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { db } from './firebase.js';
import { isSafaricomRequest } from './utils.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());

// Ping
app.get('/', (req, res) => res.send('✅ M-PESA Callback Server Running'));

// STK Callback Handler
app.post('/mpesa-callback', async (req, res) => {
    if (!isSafaricomRequest(req)) {
        console.log("❌ Unauthorized request attempt");
        return res.status(403).json({ message: "Forbidden" });
    }

    const callback = req.body?.Body?.stkCallback;

    if (!callback) return res.status(400).json({ message: 'Bad payload' });

    const resultCode = callback.ResultCode;
    const phone = callback.CallbackMetadata?.Item?.find(i => i.Name === 'PhoneNumber')?.Value;
    const amount = callback.CallbackMetadata?.Item?.find(i => i.Name === 'Amount')?.Value;

    if (resultCode === 0 && phone && amount) {
        try {
            const userRef = db.collection('wallets').doc(phone.toString());
            const doc = await userRef.get();
            const currentBalance = doc.exists ? doc.data().balance || 0 : 0;

            await userRef.set({ balance: currentBalance + amount }, { merge: true });

            console.log(`✅ Updated balance for ${phone}: +KES ${amount}`);
        } catch (e) {
            console.error('❌ Firestore error:', e.message);
        }
    } else {
        console.log("⚠️ Transaction not successful or missing info");
    }

    // Respond immediately to Safaricom
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
