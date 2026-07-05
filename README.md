# Wordle 3al Lebnene — Beirut Times

A Wordle-style daily word game built around Lebanese Arabic vocabulary.

# Status

**Live demo:** [stalwart-toffee-1b8b2d.netlify.app](https://stalwart-toffee-1b8b2d.netlify.app)
**Repository:** [github.com/Charbel-Habib/Wordle-3al-Lebnene](https://github.com/Charbel-Habib/Wordle-3al-Lebnene)

## a. Author

Charbel Habib

## b. API used

**Wikipedia Action API** (`https://en.wikipedia.org/w/api.php`) — the "؟" info modal on the main menu fetches sections 1, 3 and 4 of the live [Wordle Wikipedia article](https://en.wikipedia.org/wiki/Wordle) (Gameplay, Rise in popularity, Early development) straight from Wikipedia at runtime. The raw HTML response is parsed client-side with `DOMParser`, stripped of edit-section links, citation markers, tables and references, and rendered as a paginated 3-page card (`WikipediaSectionLoader` / `InfoModal` in [js/main.js](js/main.js)), with loading and error states for when the request fails.

## c. Description

3al Lebnene is a Wordle clone that replaces the English dictionary with everyday Lebanese Arabic words (the mix of Latin letters and numbers Lebanese people use to type Arabic on WhatsApp/social media). It keeps the classic one-puzzle-a-day, 6-try format, but adds its own identity on top:

- Animated night-sky main menu (drifting gradient, sparkle particles, skyline silhouette) with a Wordle-tile title that flips in on load.
- Dark/light theme toggle, persisted in `localStorage`.
- A full game screen with an on-screen keyboard, a hint system (reveal a letter at the cost of a try), and random ambient "weather" events (rain/snow/thunder/meteor) plus a power-outage hazard that temporarily disables the keyboard.
- A win/lose result modal with stats, and a dedicated About & Testimonials page.

## d. Custom requirement

My custom requirement was a **testimonials section styled with Bootstrap cards**. On [about.html](about.html) there's a "What Beirut is saying" section built with Bootstrap's grid (`row g-4`) and `card` components, laid out responsively (1 column on mobile, up to 3 per row on desktop). Each card is a static, curated fake reader quote (name, city, star rating) written to match the game's Beirut Times/newspaper theme, reusing the same `ThemeManager`/`SparkleField` classes as the main menu so the page stays visually consistent without duplicating the game bootstrap logic.

## Structure

```
index.html         Main menu (topbar, animated hero, game screen, info/result modals)
about.html          About Wordle + testimonials (Bootstrap cards)
css/style.css        Hand-written CSS3 (design tokens, animations, responsive rules)
js/main.js           ES6 classes: ThemeManager, SparkleField, TileTitle, StartTrigger,
                      WikipediaSectionLoader, InfoModal, game board/keyboard/weather logic
js/about.js          ThemeManager + SparkleField for the About page
Screenshots/         Evidence screenshots (see below)
```

## Screenshots


[Home page dark mode On](Screenshots/1.png) , [Home Page Light Mode On](Screenshots/2.png) ,
[Info modal — Gameplay](Screenshots/3.png) , [Info modal — Early development](Screenshots/4.png) , 
[Info modal - Rise in Popularity](Screenshots/5.png) , [About Wordle 3al Lebnene](Screenshots/6.png) ,
[Testimonial Cards](Screenshots/7.png) , [Gameplay / responsive view](Screenshots/8.png) 


## e. AI-use appendix

**Tools used:** GitHub Copilot Chat in VS Code, using the Claude Sonnet models (Claude Sonnet 5).

**Example prompts used during the project:**

**Prompt 1**
Design a main menu page and the following :

1. a background image animated with nice effects i will provide the link for the background image later.
2. a dark/light switch button.
3. in the middle of the screen a light font white animated moving sentence "press anywhere to start game" pressing that would start the wordle game. don't implement the function to start the game right now i will implement that later, for now add a debug log when the user presses anywhere.
4. a "?" icon when pressed would make 3 api calls to an 3 endpoints i will specify later the endpoints later they will return a json that will contain 3 things: gameplay, history, description and then display them over 3 pages.

**Prompt 2**
implement the following:

1. when game press starts we want to initialize and start the game.
2. implement an initializer function that draws the wordle board use an array and put divs with identifiers that can be used to identify the divs so we can update the board when the user inserts a letter etc..
3. implement a function to handle game logic(checking guesses, etc..)
4. implement a function to update the board
5. implement a function to calculates results when game ends and handles finalization.
6. when finalization happens(when game ends) add a modal with 2 buttons one to return to main menu one to start another new game.
7. in total please separate game handler logic from initialization logic from renderer logic from finalization logic


**What the AI got wrong (and had to be fixed):**
- The theme toggle initially only updated the theme value in localstorage without applying the new theme to the current user page and session, it would only apply the theme on page reload, i fixed it so it applies the theme instantly after also updating local storage. 
- Copilot suggested calling the Wikipedia API endpoint without `format=json` even though the Wikipedia API documentation states that it requires this parameter for the endpoint I'm calling, this resulted in a bad response being returned, i had to add the correct parameter and value in the API request.
