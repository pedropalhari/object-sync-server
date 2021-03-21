import { getChanges, ObjectChunk, setPropertyValue } from "./objectDiff";
import WebSocket, { Server as WSServer } from "ws";

const wss = new WSServer({ port: 8080 });

type ObjectMap = {
  [objectId: string]: any;
};

type ObjectWSMap = {
  [objectId: string]: WebSocket[];
};

export interface Change {
  chunks: ObjectChunk[];
}

export interface WSMessage {
  type: string;
  objectId: string;
  changes?: Change;
  data?: any;
}

let objectMap: ObjectMap = {};
let objectWSMap: ObjectWSMap = {};

wss.on("connection", function connection(ws) {
  ws.on("message", function incoming(message) {
    let parsedMessage: WSMessage = JSON.parse(message.toString());
    let { type, objectId } = parsedMessage;

    if (type === "subscribe") {
      if (!objectWSMap[objectId]) objectWSMap[objectId] = [];

      console.log(`Client subscribed to ${objectId}`);

      objectWSMap[objectId].push(ws);

      ws.send(
        JSON.stringify({
          type: "object",
          data: objectMap[objectId],
        })
      );
    }

    if (type === "unsubscribe") {
      if (!objectWSMap[objectId]) objectWSMap[objectId] = [];

      objectWSMap[objectId] = objectWSMap[objectId].filter((c) => c != ws);
    }

    if (type === "change") {
      if (!objectMap[objectId]) objectMap[objectId] = {};

      if (parsedMessage.changes)
        parsedMessage.changes.chunks.forEach((c) => {
          setPropertyValue(objectMap[objectId], c.path, c.chunk);
        });

      if (!objectWSMap[objectId]) return;

      console.log(`Sending update to ${objectWSMap[objectId].length}`);

      let disconnected: WebSocket[] = [];
      objectWSMap[objectId].forEach((wsc) => {
        if (wsc.readyState === ws.CLOSED) {
          return disconnected.push(ws);
        }

        wsc.send(JSON.stringify(parsedMessage));
      });

      console.log(`Found ${disconnected.length} disconnected clients`);

      // Do a quick disconnect check
      objectWSMap[objectId] = objectWSMap[objectId].filter((c) =>
        !disconnected.includes(c)
      );
    }
  });
});
