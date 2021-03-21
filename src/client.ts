import WebSocket from "ws";
import { getChanges, setPropertyValue } from "./objectDiff";
import { WSMessage } from "./server";

const ws = new WebSocket("ws://localhost:8080");

let remoteObject: any = undefined;

ws.on("open", function open() {
  let message: WSMessage = {
    type: "subscribe",
    objectId: "123",
  };

  ws.send(JSON.stringify(message));
});

ws.on("message", function incoming(data) {
  console.log(data.toString());
  let parsedMessage: WSMessage = JSON.parse(data.toString());

  if (parsedMessage.type === "object") {
    remoteObject = parsedMessage.data;
  }

  if (parsedMessage.type === "change") {
    if (parsedMessage.changes)
      parsedMessage.changes.chunks.forEach((c) => {
        remoteObject = setPropertyValue(remoteObject, c.path, c.chunk);
      });
  }

  console.log({ remoteObject });
});

function updateObject(newValue: any) {
  let chunks = getChanges(remoteObject, newValue);

  let changeMessage: WSMessage = {
    type: "change",
    objectId: "123",
    changes: {
      chunks,
    },
  };

  ws.send(JSON.stringify(changeMessage));
}

setTimeout(() => {
  updateObject({ ...remoteObject, another: [1, 2, 3] });
}, 3000);
