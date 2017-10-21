'use strict'

const socket = require('socket.io');
const querystring = require('querystring');

module.exports =  function(server) {
  let io = socket(server);
  let allUsers = {};
  let allSockets = {};
  let callKeys = {};

  io.on('connect', socket => {
    console.log("connect");
    socket.on("message", (msg) => {
      try {
        const { event, data } = msg;
        if (!event || !data) {
          throw new Error('参数有误');
        }
        if (event != "join" && !socket.name) {
          throw new Error('未创建用户');
        }
        switch (event) {
          case "join":
            if (!data.name) {
              throw new Error('用户名不能为空');
            } else if (allUsers[data.name]) {
              throw new Error('该用户名已存在, 请重新输入');
            } else {
              socket.name = data.name;
              allUsers[data.name] = 1;
              allSockets[data.name] = socket;
              socket.broadcast.emit('userReflash', allUsers);
              socket.send({
                event: "join",
                data: {
                  name: data.name,
                  allUsers
                }
              });
            }
            break;
          case "call":
            if (socket.name == data.name) {
              throw new Error('无法Call自己');
            } else if (!allUsers[data.name] || !allSockets[data.name]) {
              throw new Error('对方不在线');
            } else if (allUsers[data.name] == 2) {
              throw new Error('对方在通话中');
            } else {
              let key = `${socket.name}-${Date.now()}-${data.name}`;
              callKeys[key] = true;
              allSockets[data.name].send({
                event: "call",
                data: {
                  name: socket.name,
                  callKey: key
                }
              });
            }
            break;
          case "accpet":
            console.log(data.callKey.split('-'))
            if (!data.callKey || data.callKey.split('-').indexOf(socket.name) != 2) {
              throw new Error('无权发起对话');
            } else if (!allUsers[data.callKey.split('-')[0]] || !allSockets[data.callKey.split('-')[0]]) {
              throw new Error('对方不在线');
            } else if (allUsers[data.callKey.split('-')[0]] == 2) {
              throw new Error('对方已经在通话中');
            } else if (!callKeys[data.callKey]) {
              throw new Error('对方不在线');
            } else if (!data.offer) {
              throw new Error('参数有误');
            } else {
              let name = data.callKey.split('-')[0];
              allUsers[name] = 2;
              allUsers[socket.name] = 2;
              socket.broadcast.emit('userReflash', allUsers);
              socket.otherName = name;
              allSockets[name].send({
                event: "accpet",
                data: {
                  offer: data.offer,
                  callKey: data.callKey
                }
              });
            }
            break;
          case "reject":
            if (!data.callKey || data.callKey.split('-').indexOf(socket.name) != 2 || !callKeys[data.callKey]) {
              throw new Error('无权限');
            } else {
              let name = data.callKey.split('-')[0];
              delete callKeys[callKey];
              allSockets[name].send({
                event: "reject",
                data: {
                  callKey
                }
              });
            }
            break;
          case "answer":
            if (!data.callKey 
              || data.callKey.split('-').indexOf(socket.name) != 0 
              || !callKeys[data.callKey] 
              || allUsers[socket.name] != 2) {
              throw new Error('无权限');
            } else if (!allUsers[data.callKey.split('-')[2]]) {
              delete callKeys[data.callKey];
              allUsers[socket.name] = 1;
              throw new Error('对方不在线');
            } else if (!data.answer) {
              delete callKeys[data.callKey];
              allUsers[socket.name] = 1;
              allUsers[data.callKey.split('-')[2]] = 1;
              throw new Error('参数有误');
            } else {
              socket.otherName = data.callKey.split('-')[2];
              allSockets[data.callKey.split('-')[2]].send({
                event: "answer",
                data: {
                  callKey: data.callKey,
                  answer: data.answer
                }
              });
            }
            break;
          case "candidate":
            if (socket.otherName) {
              allSockets[socket.otherName].send({
                event: "candidate",
                data: {
                  callKey: data.callKey,
                  candidate: data.candidate
                }
              });
            }
            break;
          case "leave":
            if (!data.callKey 
              || (data.callKey.split('-').indexOf(socket.name) != 0 && data.callKey.split('-').indexOf(socket.name) != 2)
              || !callKeys[data.callKey]) {
              throw new Error('无权限');
            } else {
              delete callKeys[data.callKey];
              allUsers[socket.name] = 1;
              if (allUsers[socket.otherName]) {
                delete allSockets[socket.otherName].otherName;
                allUsers[socket.otherName] = 1;
                allSockets[socket.otherName].send({
                  event: "leave"
                });
                delete socket.otherName;
              }
              socket.broadcast.emit('userReflash', allUsers);
            }
            break;
          default:
            break;
        };
      } catch (error) {
        console.error(error);
        socket.send({
          event: "error",
          data: error.message || '参数有误'
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("disconnect");
      if(socket.name) {
        if (socket.otherName) {
          if (allUsers[socket.otherName]) {
            delete allSockets[socket.otherName].otherName;
            allUsers[socket.otherName] = 1;
            allSockets[socket.otherName].send({
              event: "leave"
            });
            delete socket.otherName;
          }
        }
        delete allUsers[socket.name];
        delete allSockets[socket.name];
      }
      console.log(allUsers)
      socket.broadcast.emit('userReflash', allUsers);
    });
  });
}