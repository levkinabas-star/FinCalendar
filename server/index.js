import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';

config();

const app = express();

app.use(express.json());
app.use(cors({ origin: '*' }));

const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;
const APP_URL = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
const PORT = Number(process.env.PORT) || 4000;

const YK_API = 'https://api.yookassa.ru/v3';

const PRICES = {
  monthly: { value: '100.00', currency: 'RUB', description: 'FinCalendar Pro — 1 месяц' },
  yearly:  { value: '1000.00', currency: 'RUB', description: 'FinCalendar Pro — 1 год' },
};

function ykHeaders(idempotenceKey) {
  const creds = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');
  return {
    'Authorization': `Basic ${creds}`,
    'Content-Type': 'application/json',
    'Idempotence-Key': idempotenceKey || uuidv4(),
  };
}

app.get('/health', (_req, res) => res.json({ ok: true }));

// Create payment
app.post('/api/payments/create', async (req, res) => {
  if (!SHOP_ID || !SECRET_KEY) {
    return res.status(500).json({ error: 'Payment credentials not configured' });
  }

  const billing = req.body?.billing === 'monthly' ? 'monthly' : 'yearly';
  const price = PRICES[billing];

  const body = {
    amount: { value: price.value, currency: price.currency },
    confirmation: {
      type: 'redirect',
      return_url: `${APP_URL}/payment-return`,
    },
    capture: true,
    description: price.description,
    metadata: { billing },
  };

  try {
    const response = await fetch(`${YK_API}/payments`, {
      method: 'POST',
      headers: ykHeaders(),
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('YooKassa create error:', JSON.stringify(data));
      return res.status(502).json({ error: data.description || 'Failed to create payment' });
    }

    res.json({
      id: data.id,
      confirmationUrl: data.confirmation.confirmation_url,
    });
  } catch (err) {
    console.error('Network error on create:', err.message);
    res.status(502).json({ error: 'Network error' });
  }
});

// Get payment status
app.get('/api/payments/:id', async (req, res) => {
  if (!SHOP_ID || !SECRET_KEY) {
    return res.status(500).json({ error: 'Payment credentials not configured' });
  }

  const { id } = req.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: 'Invalid payment id' });
  }

  try {
    const response = await fetch(`${YK_API}/payments/${id}`, {
      headers: ykHeaders(id),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('YooKassa status error:', JSON.stringify(data));
      return res.status(502).json({ error: data.description || 'Failed to get payment' });
    }

    res.json({
      id: data.id,
      status: data.status,
      billing: data.metadata?.billing ?? 'yearly',
    });
  } catch (err) {
    console.error('Network error on status:', err.message);
    res.status(502).json({ error: 'Network error' });
  }
});

// YooKassa webhook
app.post('/api/payments/webhook', (req, res) => {
  const { event, object } = req.body || {};
  console.log('Webhook:', event, object?.id, object?.status);
  res.sendStatus(200);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Payment server running on port ${PORT}`);
  console.log(`Return URL: ${APP_URL}/payment-return`);
  if (!SHOP_ID || !SECRET_KEY) {
    console.warn('WARNING: YooKassa credentials not set!');
  }
});
