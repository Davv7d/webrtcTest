Instalujemy wszystkie zależne biblioteki komendą:
 npm install
lub ręcznie

Do poprawnego działania uruchamiamy dwie aplikacje,
- 1 do strony 2 do websocketu.
- server strony musi zawierac certyfikaty bez tego nie zadziala nam pobieranie mediów(lokalnie nie ma potrzeby)
- zamieniamy adres websocket u klijenta(lokalnie nie ma potrzeby)
- uruchamiamy:
    -klienta:
        npm start 
    -server:
        (przechodzimy do katalogu server/)
        node server/server.js
