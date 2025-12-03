const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Connection Error:", err));

// Define Balance Schema
const BalanceSchema = new mongoose.Schema({ amount: { type: Number, default: 0 } });
const Balance = mongoose.model("Balance", BalanceSchema);

// Webhook for Razorpay Payment
app.post("/razorpay-webhook", async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    const signature = req.headers["x-razorpay-signature"];
    const expectedSignature = crypto.createHmac("sha256", secret)
        .update(JSON.stringify(req.body))
        .digest("hex");

    if (signature !== expectedSignature) {
        console.error("Invalid Webhook Signature");
        return res.status(400).json({ error: "Invalid Signature" });
    }

    if (req.body.event === "payment.captured") {
        try {
            const result = await Balance.findOneAndUpdate({}, { $inc: { amount: 1 } }, { upsert: true, new: true });
            console.log("Balance Updated:", result.amount);
        } catch (error) {
            console.error("Error updating balance:", error);
        }
    }

    res.status(200).json({ success: true });
});

// API to Fetch Balance
app.get("/balance", async (req, res) => {
    try {
        const balance = await Balance.findOne();
        res.json({ balance: balance ? balance.amount : 0 });
    } catch (error) {
        console.error("Error fetching balance:", error);
        res.status(500).json({ error: "Failed to fetch balance" });
    }
});

app.listen(PORT, () => {
    console.log(Server running on port ${PORT});
});
