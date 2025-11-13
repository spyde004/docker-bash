import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import "xterm/css/xterm.css";

function App() {
  const terminalRef = useRef();

  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "monospace",
      theme: { background: "#1e1e1e", foreground: "#ffffff" },
    });

    term.open(terminalRef.current);
    term.writeln("🟢 Connected to secure containerized Bash\n");

    const socket = new WebSocket("ws://localhost:3001");

    socket.onopen = () => term.writeln("Connection established.\r\n");
    socket.onmessage = (e) => term.write(e.data);
    socket.onclose = () => term.writeln("\r\n🔴 Disconnected from server");

    let commandBuffer = "";

    term.onData((data) => {
      if (data === "\r") {
        socket.send(commandBuffer + "\n");
        term.write("\r\n");
        commandBuffer = "";
      } else if (data === "\u007F") {
        if (commandBuffer.length > 0) {
          commandBuffer = commandBuffer.slice(0, -1);
          term.write("\b \b");
        }
      } else {
        commandBuffer += data;
        term.write(data);
      }
    });

    return () => socket.close();
  }, []);

  return <div ref={terminalRef} style={{ height: "100vh", width: "100%" }} />;
}

export default App;
