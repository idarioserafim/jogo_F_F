const { Server } = require("socket.io");

// Cria o servidor de Socket na porta 3000
const io = new Server(3000, {
  cors: {
    origin: "*", // Permite conexões de qualquer lugar
  },
});

// Objeto para gerenciar as salas e quem está nelas
const rooms = {};

io.on("connection", (socket) => {
  console.log("Novo jogador conectado: " + socket.id);

  // Criar ou entrar em uma sala
  socket.on("join-room", (roomCode, username) => {
    socket.join(roomCode);
    
    if (!rooms[roomCode]) {
      rooms[roomCode] = { players: [] };
    }
    
    // Adiciona o jogador à lista daquela sala
    rooms[roomCode].players.push({ id: socket.id, name: username });
    
    // Avisa todos na sala que um novo jogador entrou
    io.to(roomCode).emit("update-players", rooms[roomCode].players);
    console.log(`${username} entrou na sala ${roomCode}`);
  });

  // Exemplo: Repassar pontuação ou jogada para os outros
  socket.on("send-move", (roomCode, moveData) => {
    socket.to(roomCode).emit("receive-move", moveData);
  });

  // Remover jogador ao desconectar
  socket.on("disconnect", () => {
    console.log("Jogador desconectado");
    // Aqui você poderia adicionar lógica para remover o jogador da sala
  });
});