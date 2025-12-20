# DrawTogether 🎨

A real-time collaborative drawing application where users can create rooms, invite friends, and draw together!

## Features

- 🎨 **Real-time Collaborative Drawing** - Draw with friends in real-time
- 👥 **Social System** - Add friends, send invites, see who's online
- 🏠 **Room System** - Create public/private rooms
- 🎭 **Avatar System** - Customize your profile with avatars
- 🪙 **Credit System** - Earn and spend credits
- 🔐 **Google OAuth** - Secure authentication
- 📱 **Responsive Design** - Works on all devices

## Tech Stack

**Frontend:**
- React + Vite
- Socket.io Client
- Framer Motion
- Axios

**Backend:**
- Node.js + Express
- Socket.io
- MongoDB + Mongoose
- JWT Authentication
- Google OAuth

## Local Development

### Prerequisites

- Node.js 16+
- MongoDB Atlas account
- Google OAuth credentials

### Setup

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/drawtogather.git
cd drawtogather
```

2. Install dependencies:
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. Configure environment variables:

**Server (.env):**
```env
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
PORT=5000
```

**Client (.env):**
```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

4. Run the application:

```bash
# Terminal 1 - Run server
cd server
npm run dev

# Terminal 2 - Run client
cd client
npm run dev
```

5. Open http://localhost:5173 in your browser

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions to Vercel and Render.

## Project Structure

```
drawtogather/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── utils/         # Utility functions
│   │   ├── App.jsx        # Main app component
│   │   └── App.css        # Styles
│   ├── public/            # Static assets
│   └── package.json
├── server/                # Node.js backend
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── utils/            # Utility functions
│   ├── index.js          # Server entry point
│   └── package.json
└── README.md
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for learning or personal use.

## Author

Created with ❤️ by MAHESH DAVID

---

**Live Demo:** [Coming Soon]

**Support:** For issues or questions, please open an issue on GitHub.
