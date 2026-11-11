const express = require('express');
const cors = require('cors');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const app = express();
app.use(cors()); app.use(express.json());
let bots = {}; let commands = {};
app.post('/create-bot', async (req, res) => {
  const { phone, name } = req.body; const id = phone;
  if (bots[id]) return res.json({ success: true });
  const { state, saveCreds } = await useMultiFileAuthState('session_' + id);
  const sock = makeWASocket({ logger: pino({level:'silent'}), auth: state, browser: [name||'DALTON','Chrome','1.0'] });
  bots[id] = sock; commands[id] = [];
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('messages.upsert', async (m) => {
    let msg = m.messages[0]; if(!msg.message || msg.key.fromMe) return;
    let text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    let list = commands[id] || [];
    let found = list.find(c => text.trim() === c.n);
    if (found) await sock.sendMessage(msg.key.remoteJid, { text: found.r });
  });
  res.json({ success: true });
});
app.post('/pairing-code', async (req, res) => {
  const { phone } = req.body; const sock = bots[phone];
  if (!sock) return res.json({ success: false, error: 'اعمل بوت الاول' });
  try { let code = await sock.requestPairingCode(phone); res.json({ success: true, code }); } catch(e){ res.json({ success: false, error: e.message }); }
});
app.post('/add-command', (req, res) => {
  const { phone, name, reply, price } = req.body;
  if (!commands[phone]) commands[phone] = [];
  commands[phone].push({ n: name, r: reply, p: price });
  res.json({ success: true });
});
app.get('/commands/:phone', (req, res) => { res.json(commands[req.params.phone] || []); });
app.get('/status/:phone', (req, res) => { res.json({ online: !!bots[req.params.phone] }); });
app.get('/', (req,res)=>res.send('DALTON SERVER شغال ✅'));
const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=>console.log('Server on '+PORT));