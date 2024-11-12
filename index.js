const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode-terminal');

const app = express();
const port = 3000;

// Membuat instance klien WhatsApp dengan autentikasi lokal
const client = new Client({
    authStrategy: new LocalAuth()  // Menyimpan sesi agar tidak perlu scan QR setiap kali
});

app.use(express.json());

let isClientReady = false;  // Tambahkan variabel untuk cek apakah klien siap

// Fungsi untuk mengirim pesan ke grup
async function sendMessageToGroup(groupName, message) {
    const chats = await client.getChats();
    const group = chats.find(chat => chat.isGroup && chat.name === groupName);

    if (group) {
        await group.sendMessage(message);
        console.log(`Pesan berhasil dikirim ke grup "${groupName}"`);
    } else {
        console.log(`Grup "${groupName}" tidak ditemukan.`);
    }
}

// Endpoint untuk menerima data dari ESP32
app.get('/send-message', (req, res) => {
    if (!isClientReady) {
        return res.status(503).send('WhatsApp Client belum siap, silakan coba lagi nanti.');
    }

    const { groupName, message } = req.query;

    // Cek apakah groupName dan message ada
    if (!groupName || !message) {
        return res.status(400).send('Parameter groupName dan message harus ada');
    }

    console.log(`Group Name: ${groupName}, Message: ${message}`);

    sendMessageToGroup(groupName, message)
        .then(() => res.send('Pesan berhasil dikirim'))
        .catch((error) => res.status(500).send(`Gagal mengirim pesan: ${error.message}`));
});

// Memulai server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});

// Memulai klien WhatsApp
client.initialize();

// Menampilkan QR code di terminal saat login pertama kali
client.on('qr', (qr) => {
    console.log('Scan QR code ini untuk login:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Web siap digunakan!');
    isClientReady = true;
});

client.on('auth_failure', (message) => {
    console.error('Gagal otentikasi:', message);
    isClientReady = false;
});

client.on('disconnected', (reason) => {
    console.log('Klien WhatsApp terputus:', reason);
    isClientReady = false;
});
