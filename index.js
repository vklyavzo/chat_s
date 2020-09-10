
var express = require('express');//подкл библеот экспресс
var app = express();// экземпл экспресса для орпед маршрутов и промеж обработ
var path = require('path');//для работы с путями в файл сист
var server = require('http').createServer(app);//созд сервер
var io = require('socket.io')(server);//подкл библ сокет
var port = 3000;//порт по котор идет доступ к серверу

//запуск сервера
server.listen(port, () => { 
  console.log('Server listening at port %d', port);
});

// функция промежуточной обработки или доступа к статическим ресурсам
app.use(express.static(path.join(__dirname, 'public')));

// страница чата

var numUsers = 0; //счетчик пользователей

//1. запуск 
io.on('connection', (socket) => {
  var addedUser = false;

  // событие новое сообщение
  socket.on('new message', (data) => {
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  //3. событие пользователь добавлен
  socket.on('add user', (username) => {
    if (addedUser) return;

    // сохр имя пользователя в сокет сеансе
    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // для всех что человек подключился
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  //3. когда человек печатает отправляем это уведомление другим
  socket.on('typing', () => {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  //4. когда перестает печатать тож это отправляем другим
  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // если отключился
  socket.on('disconnect', () => {
    if (addedUser) {
      --numUsers;

      // уведомляем других
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
