"use client";
import { useState } from "react";
import { VT323 } from "next/font/google";
import CryptoJS from "crypto-js";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { useEffect } from "react";
import MatrixRain from "./components/MatrixRain";
const useHydrationWarning = () => {
  useEffect(() => {
    if (typeof window !== "undefined" && window.document) {
      console.warn("⚠️ Supper hydration warning: Ensure proper hydration!");
    }
  }, []);
};

const vt323 = VT323({
  subsets: ["latin"],
  weight: "400",
});

const SendCommand = () => {
  useHydrationWarning();
  const [content, setContent] = useState("");
  //const [cryptedPassword, setCryptedPassword] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [infosContent, setInfosContent] = useState<JSX.Element | null>(null);
  const [hasRenderedInfos, setHasRenderedInfos] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyContent, setHistoryContent] = useState("");

  useEffect(() => {
    if (authed && showHistory) {
      const fetchHistory = () => {
        fetch("/api/history")
          .then((res) => res.text())
          .then((data) => setHistoryContent(data));
      };

      fetchHistory();
      const interval = setInterval(fetchHistory, 3000);
      return () => clearInterval(interval);
    }
  }, [authed, showHistory]);

  useEffect(() => {
    fetch("/welcome.txt")
      .then((res) => res.text())
      .then((text) => setContent(text));
  }, []);

  const [command, setCommand] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [response, setResponse] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("http://localhost:3001/api/status")
        .then((res) => res.json())
        .then((data) => {
          setIsConnected(data.connected);
        })
        .catch(() => setIsConnected(false));
    }, 2000); // toutes les 2 secondes

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (authed && !hasRenderedInfos) {
      renderInfos();
      setHasRenderedInfos(true);
    }
  }, [authed, hasRenderedInfos]);

  const handleCommandChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCommand(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    console.log("mdp");
    //console.log(command);

    const key = CryptoJS.enc.Utf8.parse("1234567890abcdef");
    const iv = CryptoJS.enc.Utf8.parse("abcdef1234567890");

    const plaintext = "";

    const encrypted = CryptoJS.AES.encrypt(command, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const test = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
    console.log(test);
    setCommand(test);

    console.log("📤 Envoi de la commande:", command);

    if (!authed) {
      try {
        const res = await fetch("http://localhost:3001/api/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ command: test }),
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log("📥 Réponse du serveur:", data.tcp_data);
        if (data.tcp_data === "success\u0000") {
          setAuthed(true);
        }

        setResponse(data);
        setCommand("");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error("Erreur de communication:", error);
        setResponse({
          message: "Erreur de communication avec le serveur",
          success: false,
        });
      }
    } else {
      console.log("authed");
      try {
        const res = await fetch("http://localhost:3001/api/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ command }),
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log("📥 Réponse du serveur:", data.tcp_data);
        if (data.tcp_data === "success\u0000") {
          setAuthed(true);
        }

        setResponse(data);
        setCommand("");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error("Erreur de communication:", error);
        setResponse({
          message: "Erreur de communication avec le serveur",
          success: false,
        });
      }
    }
  };

  const renderInfos = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command: "infos" }),
      });
      const data = await res.json();
      setInfosContent(
        <div className="max-h-96 overflow-y-auto border border-green-500 rounded p-2">
          <pre className="text-xs text-green-00 whitespace-pre-wrap break-words">
            {data.tcp_data}
          </pre>
        </div>
      );
    } catch (error) {
      console.error(error);
      setInfosContent(
        <p className="text-red-400 text-xs">
          Erreur lors du chargement des infos
        </p>
      );
    }
  };

  const fetchBashHistory = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command: "cat home/debian/.bash_history" }),
      });
      const data = await res.json();
      console.log("📥 Réponse historique:", data.tcp_data);
      setResponse(data);
    } catch (error) {
      console.error("Erreur de communication:", error);
      setResponse({
        message: "Erreur de communication avec le serveur",
        success: false,
      });
    }
  };
  const renderResponse = () => {
    if (!response)
      return <p className="text-gray-400 text-center">Aucune réponse</p>;

    const match = response.tcp_data?.match(/return code: (\d+)/i);
    const returnCode = match ? parseInt(match[1], 10) : null;
    const isSuccess = returnCode === 0;

    const cleanedTcpData = response.tcp_data
      ?.replace(/.*return code: \d+\s*/i, "") // supprime ligne + saut de ligne
      .trim();

    return (
      <div>
        <p
          className={`text-lg font-semibold ${
            isSuccess ? "text-green-400" : "text-red-400"
          }`}
        >
          {isSuccess ? "Commande réussie" : "Erreur de commande"}
        </p>

        <p className="text-sm text-gray-300 mt-1">
          Code de retour :{" "}
          <span
            className={`font-bold ${
              isSuccess ? "text-green-300" : "text-red-300"
            }`}
          >
            {returnCode !== null ? returnCode : "Inconnu"}
          </span>
        </p>

        {cleanedTcpData && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-white">
              {isSuccess
                ? "Sortie standard (stdout)"
                : "Erreur standard (stderr)"}
            </h3>
            <pre className="text-gray-200 whitespace-pre-wrap break-words mt-2">
              {cleanedTcpData}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <style jsx>{`
        .blink {
          animation: blink 1s step-start infinite;
        }
        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
      `}</style>
      <section
        className={`w-full h-screen text-xl ${vt323.className}`}
        style={{
          color: "rgba(93, 253, 0)",
          textShadow:
            "1 1 2px rgba(150, 167, 124),0 0 1em rgba(150, 167, 124),0 0 0.2em rgba(150, 167, 124)",
        }}
      >
        <div className="grid grid-cols-5 grid-rows-5 gap-4 h-screen p-4">
          <div className="col-span-2 row-span-2 border border-green-400 p-2 flex flex-col">
            <div className="h-[75%] flex flex-col">
              <div className="w-full flex flex-col justify-center items-center">
                <pre className="text-xs items-center">{content}</pre>
              </div>
            </div>
            <div className="h-[25%] flex items-end">
              <div className="flex flex-row w-full items-center">
                <ChevronRight
                  className="mr-2"
                  style={{
                    animation: "blink 1s step-start infinite",
                  }}
                />
                <form onSubmit={handleSubmit}>
                  {!authed ? (
                    <>
                      <div className="flex flex-row items-center gap-2">
                        <Lock />
                        <input
                          type="text"
                          value="disabled"
                          onChange={handleCommandChange}
                          placeholder="..."
                          className="h-8 focus:outline-none w-full"
                          disabled
                        />
                      </div>
                    </>
                  ) : (
                    <input
                      type="text"
                      value={command}
                      onChange={handleCommandChange}
                      placeholder="..."
                      className="h-8 focus:outline-none w-full"
                    />
                  )}
                </form>
              </div>
            </div>
          </div>
          <div className="col-span-3 row-span-2 col-start-3 border border-green-400 overflow-y-scroll p-4">
            {/* put the response here */}
            <div className="flex flex-col items-center h-full">
              <h2 className="text-lg font-semibold">Réponse</h2>
              <div className="mt-4 p-4rounded-md w-full">
                {renderResponse()}
              </div>
            </div>
          </div>
          <div className="row-span-3 row-start-3 border-green-400 border flex flex-col items-center p-4">
            <div className="w-full p-4">
              <div className="border-green-400 border p-2 w-full">
                <p>Status</p>
                <div className="flex flex-col">
                  <div className="flex flex-row gap-2 items-center">
                    <div
                      className={`rounded-full w-3 h-3 ${
                        isConnected ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <p>192.168.100.11</p>
                  </div>
                </div>
              </div>
              <div className="border-green-400 border p-1 w-full mt-3">
                <p>System information:</p>
                {infosContent}
              </div>
            </div>
          </div>
          <div className="col-span-2 row-span-3 row-start-3 border flex p-4 border-green-400">
            <div className="w-full p-4 flex justify-center items-center">
              <p className="text-[8px] text-center">
                ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⡠⢤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡴⠟⠃⠀⠀⠙⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀
                ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⠋⠀⠀⠀⠀⠀⠀⠘⣆⠀⠀⠀⠀⠀⠀⠀⠀
                ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⠾⢛⠒⠀⠀⠀⠀⠀⠀⠀⢸⡆⠀⠀⠀⠀⠀⠀⠀
                ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣶⣄⡈⠓⢄⠠⡀⠀⠀⠀⣄⣷⠀⠀⠀⠀⠀⠀⠀
                ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⣷⠀⠈⠱⡄⠑⣌⠆⠀⠀⡜⢻⠀⠀⠀⠀⠀⠀⠀
                ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⡿⠳⡆⠐⢿⣆⠈⢿⠀⠀⡇⠘⡆⠀⠀⠀⠀⠀⠀
                ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⣿⣷⡇⠀⠀⠈⢆⠈⠆⢸⠀⠀⢣⠀⠀⠀⠀⠀⠀
                ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣧⠀⠀⠈⢂⠀⡇⠀⠀⢨⠓⣄⠀⠀⠀⠀
                ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⣦⣤⠖⡏⡸⠀⣀⡴⠋⠀⠈⠢⡀⠀⠀
                ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣾⠁⣹⣿⣿⣿⣷⣾⠽⠖⠊⢹⣀⠄⠀⠀⠀⠈⢣⡀
                ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡟⣇⣰⢫⢻⢉⠉⠀⣿⡆⠀⠀⡸⡏⠀⠀⠀⠀⠀⠀⢇
                ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢨⡇⡇⠈⢸⢸⢸⠀⠀⡇⡇⠀⠀⠁⠻⡄⡠⠂⠀⠀⠀⠘
                ⢤⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⠛⠓⡇⠀⠸⡆⢸⠀⢠⣿⠀⠀⠀⠀⣰⣿⣵⡆⠀⠀⠀⠀
                ⠈⢻⣷⣦⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⡿⣦⣀⡇⠀⢧⡇⠀⠀⢺⡟⠀⠀⠀⢰⠉⣰⠟⠊⣠⠂⠀⡸
                ⠀⠀⢻⣿⣿⣷⣦⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⢧⡙⠺⠿⡇⠀⠘⠇⠀⠀⢸⣧⠀⠀⢠⠃⣾⣌⠉⠩⠭⠍⣉⡇
                ⠀⠀⠀⠻⣿⣿⣿⣿⣿⣦⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣞⣋⠀⠈⠀⡳⣧⠀⠀⠀⠀⠀⢸⡏⠀⠀⡞⢰⠉⠉⠉⠉⠉⠓⢻⠃
                ⠀⠀⠀⠀⠹⣿⣿⣿⣿⣿⣿⣷⡄⠀⠀⢀⣀⠠⠤⣤⣤⠤⠞⠓⢠⠈⡆⠀⢣⣸⣾⠆⠀⠀⠀⠀⠀⢀⣀⡼⠁⡿⠈⣉⣉⣒⡒⠢⡼⠀
                ⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣿⣿⣿⣎⣽⣶⣤⡶⢋⣤⠃⣠⡦⢀⡼⢦⣾⡤⠚⣟⣁⣀⣀⣀⣀⠀⣀⣈⣀⣠⣾⣅⠀⠑⠂⠤⠌⣩⡇⠀
                ⠀⠀⠀⠀⠀⠀⠘⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡁⣺⢁⣞⣉⡴⠟⡀⠀⠀⠀⠁⠸⡅⠀⠈⢷⠈⠏⠙⠀⢹⡛⠀⢉⠀⠀⠀⣀⣀⣼⡇⠀
                ⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⣿⣿⣿⣿⣿⣿⣿⣿⣽⣿⡟⢡⠖⣡⡴⠂⣀⣀⣀⣰⣁⣀⣀⣸⠀⠀⠀⠀⠈⠁⠀⠀⠈⠀⣠⠜⠋⣠⠁⠀
                ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⢿⣿⣿⣿⡟⢿⣿⣿⣷⡟⢋⣥⣖⣉⠀⠈⢁⡀⠤⠚⠿⣷⡦⢀⣠⣀⠢⣄⣀⡠⠔⠋⠁⠀⣼⠃⠀⠀
                ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⣿⣿⡄⠈⠻⣿⣿⢿⣛⣩⠤⠒⠉⠁⠀⠀⠀⠀⠀⠉⠒⢤⡀⠉⠁⠀⠀⠀⠀⠀⢀⡿⠀⠀⠀
                ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢿⣤⣤⠴⠟⠋⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠑⠤⠀⠀⠀⠀⠀⢩⠇⠀⠀⠀
                ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
              </p>
            </div>
            <div className="w-1/2 flex justify-center items-center border border-green-400">
              <p className="text-xs text-center">Colonne droite</p>
            </div>
          </div>

          <div className="col-span-2 row-span-2 col-start-4 row-start-3 border-green-400 border">
            <MatrixRain fontSize={18} speed={50} />
          </div>
          <div className="col-span-2 col-start-4 row-start-5 border border-green-400 flex justify-center items-center">
            {authed ? (
              <button
                onClick={() => {
                  setShowHistory(!showHistory);
                  fetchBashHistory();
                }}
              >
                History command
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p>Please authent yourself</p>
                <div className="flex flex-row gap-2">
                  <ChevronRight></ChevronRight>
                  <form onSubmit={handleSubmit}>
                    <input
                      type="password"
                      placeholder="***"
                      className="text-center focus:outline-none"
                      value={command}
                      onChange={handleCommandChange}
                    />
                  </form>
                  <ChevronLeft></ChevronLeft>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};
//made by <3 by Alexis,Antoine
export default SendCommand;
