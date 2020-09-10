$(function() {
  var FADE_TIME = 150; // конствнты милисеки время плавного появления 
  var TYPING_TIMER_LENGTH = 400; //константы  милисеки задержка сообщения
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // инициализация переменных
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // ввод имени 
  var $messages = $('.messages'); // вобласть сообщений
  var $inputMessage = $('.inputMessage'); // ввод сообщений 

  var $loginPage = $('.login.page'); 
  var $chatPage = $('.chat.page');

 
  var username;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();

//подключение сокет
  var socket = io();


// 5. скока в чате юзеров
  const addParticipantsMessage = (data) => {
    var message = '';
    if (data.numUsers === 1) {
      message += "there's 1 participant";
    }
    else {
      message += "there are " + data.numUsers + " participants";
    }
    
    log(message);
  }



  // 2. задаем клиенту имя пользователя
  const setUsername = () => {
    username = cleanInput($usernameInput.val().trim());

    // если действительно
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();
      socket.emit('add user', username);
    }
  }



  // отправка сообщений в чат
  const sendMessage = () => {
    var message = $inputMessage.val();
    //не допускает введение разметки в сообщения
    message = cleanInput(message);
    // если есть не пустое сообщение или сокет подключение
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message
      });
      // грим серверу выполнить событ новое сообщение
      socket.emit('new message', message);
    }
  }




  //  ввод сообщений 
    const log = (message, options) => {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }





  // 5. добавляет сообщения чата в список
  const addChatMessage = (data, options) => {
    // если ктото набирает чет то сообщения не исчезнут
    var $typingMessages = getTypingMessages(data);
    options = options || {};//если оптионс андерфайнд то сделать его пустым объектом
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }





  //4. добавляем сообщение о наборе сообщунек
  const addChatTyping = (data) => {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }





  //4. удаляем уведомление о печати сообщения
  const removeChatTyping = (data) => {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }





  //8. добавим елемент сообщения к сообщениям и прокрутим вниз
  // el - елементы для добавления в качестве сообщений
  // options.fade - если елемент должен исчезнуть (default = true)
  // options.prepend - если элемент должен предшествовать всем остальныем сообщениям (default = false)
  const addMessageElement = (el, options) => {
    var $el = $(el);

    // устанавливаем по умолчанию
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // применяем параметры
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }




  // экранизация хтмл разметки
  const cleanInput = (input) => {
    return $('<div/>').text(input).html();
  }




  //2. обновление события тайпинг
  const updateTyping = () => {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }

      lastTypingTime = (new Date()).getTime();

      setTimeout(() => {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }




  //6. присылает сообщение что такой-то чел печатает
  const getTypingMessages = (data) => {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }





  //7. функция устрановки цвета юзера через хеееш
  const getUsernameColor = (username) => {
    
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // калькулятор цвета юзера
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }





  // Keyboard события

  $window.keydown(event => {
    //автофокус
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // если нажунькал ENTER
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  });


//1. начинаем печатать
  $inputMessage.on('input', () => { //если печатаем вып обнов
    updateTyping();
  });




  // Click события

 
  $loginPage.click(() => {
    $currentInput.focus();
  });

  $inputMessage.click(() => {
    $inputMessage.focus();
  });


  // Socket события

//4. пишем привет пользователю
  socket.on('login', (data) => {
    connected = true;
  
    var message = "Welcome to Chat – ";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });


  socket.on('new message', (data) => {
    addChatMessage(data);
  });

// 4. оповещаем всех
  socket.on('user joined', (data) => {
    log(data.username + ' joined');
    addParticipantsMessage(data);
  });


  socket.on('user left', (data) => {
    log(data.username + ' left');
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

// 3.
  socket.on('typing', (data) => {
    addChatTyping(data);
  });

//3. 
  socket.on('stop typing', (data) => {
    removeChatTyping(data);
  });

  socket.on('disconnect', () => {//встроенное событие
    log('you have been disconnected');
  });

  socket.on('reconnect', () => {//встроенное событие 
    log('you have been reconnected');
    if (username) {
      socket.emit('add user', username);
    }
  });

  socket.on('reconnect_error', () => {//встроенное событие 
    log('attempt to reconnect has failed');
  });

});
