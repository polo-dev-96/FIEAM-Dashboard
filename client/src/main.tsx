/*
 * ============================================================
 * main.tsx — Ponto de entrada da aplicação React
 * ============================================================
 *
 * Este é o PRIMEIRO arquivo executado no frontend.
 * Ele conecta o React ao HTML real da página (ao elemento <div id="root">
 * que existe no arquivo public/index.html).
 *
 * Pense assim: o HTML tem uma "caixa vazia" com id="root",
 * e este arquivo diz ao React: "coloca todo o App dentro dessa caixa".
 * ============================================================
 */

// createRoot: função do React que "monta" a aplicação dentro de um elemento HTML
import { createRoot } from "react-dom/client";

// App: componente raiz que contém toda a estrutura de rotas e providers da aplicação
import App from "./App";

// Importa os estilos globais (cores, fontes, variáveis CSS do design system FIEAM)
import "./index.css";

/*
 * document.getElementById("root") → encontra o <div id="root"> no index.html
 * createRoot(...)                  → prepara o React para renderizar nesse elemento
 * .render(<App />)                 → insere o componente App (toda a aplicação) na tela
 *
 * O "!" no final de getElementById("root")! é TypeScript dizendo:
 * "tenho certeza que esse elemento existe, não vai ser null"
 */
createRoot(document.getElementById("root")!).render(<App />);
