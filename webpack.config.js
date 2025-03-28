const path = require("path");

module.exports = {
  entry: "./lib/index.ts",           // Точка входа вашего приложения
  mode: "production",                // Минификация включена (или "development" для отладки)
  module: {
    rules: [
      {
        test: /\.ts$/,               // Обрабатывать все .ts файлы
        use: "ts-loader",            // Использовать ts-loader для TypeScript
        exclude: /node_modules/      // Исключить node_modules
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".js"]       // Поддерживаемые расширения файлов
  },
  output: {
    filename: "smart-form.bundle.js",           // Имя выходного файла
    path: path.resolve(__dirname, "dist"), // Папка для вывода
    libraryTarget: "window"          // Экспорт в window для браузера
  }
};