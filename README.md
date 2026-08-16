# 🌄 Périclès Initiative

![HTML](.gitlab/badges/html.svg)
![CSS](.gitlab/badges/css.svg)
![TypeScript](.gitlab/badges/typescript.svg)

![Svelte](.gitlab/badges/svelte.svg)
![SvelteKit](.gitlab/badges/sveltekit.svg)
![TailwindCSS](.gitlab/badges/tailwindcss.svg)
![Lucide](.gitlab/badges/lucide.svg)
![Playwright](.gitlab/badges/playwright.svg)
![Inlang](.gitlab/badges/inlang.svg)
![Vite](.gitlab/badges/vite.svg)
![Prettier](.gitlab/badges/prettier.svg)
![ESLint](.gitlab/badges/eslint.svg)

> [!CAUTION]
> 🤫 Please consider this an internal project. Some features and content may seem useless to you, as they are primarily designed for my own personal use. Support is not guaranteed, unlike with my other projects.

## In French

> [!IMPORTANT]
> Le code du projet est aussi hébergé sur mon instance GitLab personnalisée, accessible à [cette adresse](https://git.florian-dev.fr/floriantrayon/Pericles-Initiative). Le dépôt GitHub est un miroir du dépôt GitLab, **mis à jour automatiquement**.
>
> **Les contributions publiques restent sur GitHub et sont les bienvenues** ; les pull requests validées y seront ensuite transférées manuellement sur GitLab pour être intégrées. 🙂

### Introduction

Ceci est un projet personnel que je pensais faire depuis longtemps, mais pour lequel je ne trouvais pas assez de temps pour le réaliser. Avec une bonne dose de motivation et l'aide de l'intelligence artificielle, j'ai pu le concrétiser. Il s'agit d'un site Internet sous la forme d'une encyclopédie, à la manière du célèbre site Internet [Wikipédia](https://fr.wikipedia.org/), qui permet de manière simplifiée de créer et documenter un univers de fiction. Cette création d'univers se fait à partir de fiches de connaissances, qui peuvent être liées à d'autres, mais aussi à une chronologie et à des événements en direct, en fonction de vos besoins. Voici donc **Périclès Initiative** ! ☺️

Sous ce nom (anglais !) plutôt déroutant, en référence à un ancien [Google Sites](https://sites.google.com/) personnel que j'avais créé pour les besoins de mes sessions de jeu de rôle sur le jeu vidéo [Garry's Mod](https://fr.wikipedia.org/wiki/Garry%27s_Mod), se trouve le résultat de ce que j'aurais voulu avoir il y a quelques années et que je vais m'amuser à utiliser pour mes nouveaux projets de fiction. En termes de fonctionnalités, on retrouve l'essentiel, comme un système de gestion de fiches, de chronologies et d'événements, de traductions, de gestion des médias, de synchronisation et de gestion des données issues de l'encyclopédie. Certaines fonctionnalités restent même disponibles lorsque vous avez quitté le site et que vous êtes désormais hors ligne, merci les [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) ! 🎀

Oui, vous l'avez deviné, il n'y a pas de système d'authentification, ni de gestion des utilisateurs. Le site est conçu pour un usage personnel et n'est pas destiné à être utilisé par plusieurs personnes. D'ailleurs, le site GitLab Pages hébergé pour ce projet est disponible à toutes et à tous à des fins de visibilité, mais sauf réelle utilité, il ne vous servira à rien. Pourquoi ? Parce que ce site, fonctionnant que dans votre navigateur, se base sur des données importables via un fichier [JSON](https://fr.wikipedia.org/wiki/JavaScript_Object_Notation) ou via un serveur de sauvegarde externe que vous devez fournir. Vous pouvez travailler sans tout ça, mais vos données ne sortiront pas de votre navigateur et les autres ne pourront pas voir ce que vous avez fait : tout est côté client, aucun intermédiaire, aucune base de données, aucun serveur. La vie est belle, non ? 😉

Durant la création du site Internet, je me suis efforcé de respecter des valeurs de sobriété numérique, d'accessibilité et de respect de la vie privée. Le site est complètement statique, ne contient ni cookies, ni publicité, et n'utilise aucune technologie de suivi par défaut. Il est également accessible à tous, sans restriction. Entièrement basé sur [SvelteKit](https://svelte.dev/docs/kit) ❣️, [Vite](https://vite.dev/), [TailwindCSS](https://tailwindcss.com/) et [TypeScript](https://www.typescriptlang.org/), il utilise des technologies Web modernes et performantes, et est hébergé sur [GitLab Pages](https://docs.gitlab.com/user/project/pages/) pour limiter son empreinte carbone. 🌼

```mermaid
sequenceDiagram
    actor Utilisateur
    participant Interface
    participant Stockage local
    participant Éditeur interactif
    participant Fichier JSON
    participant Sauvegarde en ligne

    Utilisateur->>Interface: J'ouvre le site
    Interface->>Stockage local: Lit la surcouche, une fois la page hydratée
    Stockage local-->>Interface: Mes fiches, catégories et événements
    Interface-->>Utilisateur: L'accueil, ou une invitation à créer si le wiki est vide

    Utilisateur->>Interface: Je parcours le wiki, les catégories, la chronologie
    Interface-->>Utilisateur: Les fiches, leurs rétroliens et leurs lectures liées
    Interface-->>Utilisateur: Un lien rouge quand la fiche visée n'existe pas encore

    loop À chaque fiche
        Utilisateur->>Éditeur interactif: Je crée ou je modifie une fiche
        Éditeur interactif->>Stockage local: Enregistre la fiche dans la surcouche
        Stockage local-->>Utilisateur: Le contenu, aussitôt disponible et hors ligne
    end

    Utilisateur->>Interface: Je publie un événement dans le direct
    Interface-->>Utilisateur: Le fil se réorganise, et alerte le site entier si besoin

    Utilisateur->>Interface: Je consulte le tableau de bord
    Interface-->>Utilisateur: Chiffres, répartitions, fiches les plus citées, liens rouges

    Utilisateur->>Fichier JSON: J'exporte mes données
    Fichier JSON-->>Utilisateur: Une sauvegarde que je peux versionner
    Utilisateur->>Interface: J'importe un fichier
    Interface->>Stockage local: Remplace intégralement le contenu du navigateur

    Utilisateur->>Sauvegarde en ligne: J'envoie un instantané, si j'en ai configuré une
    Sauvegarde en ligne-->>Utilisateur: L'état de la synchronisation
    Utilisateur->>Sauvegarde en ligne: Je récupère l'instantané depuis un autre navigateur
    Sauvegarde en ligne-->>Stockage local: Le jeu de données complet, réinstallé dans la surcouche
```

### Installation

> [!WARNING]
> Le déploiement en environnement de production nécessite un serveur Web déjà configuré comme [Nginx](https://nginx.org/en/), [Apache](https://httpd.apache.org/) ou [Caddy](https://caddyserver.com/) pour servir les fichiers statiques générés par Vite. ⚠️

#### Développement local

- Installer [Node.js LTS](https://nodejs.org/) (>22 ou plus) ;
- Installer les dépendances du projet avec la commande `npm install` ;
- Démarrer le serveur local Vite avec la commande `npm run dev`.

#### Déploiement en production

- Installer [Node.js LTS](https://nodejs.org/) (>22 ou plus) ;
- Installer les dépendances du projet avec la commande `npm install` ;
- Compiler les fichiers statiques du site Internet avec la commande `npm run build` ;
- Utiliser un serveur Web pour servir les fichiers statiques générés à l'étape précédente.

#### Sauvegarde distante (facultative)

Le site peut se synchroniser avec un serveur HTTP externe, optionnel et déconnecté par défaut : tant
qu'aucune URL n'est renseignée sur la page `/data`, aucune requête réseau n'est envoyée. Le contrat est
minimal : `GET` et `PUT` sur `{baseUrl}/dataset` échangent l'intégralité du jeu de données en JSON, sans
fusion ni notion d'utilisateur. Un secret optionnel peut être envoyé en en-tête `X-Pericles-Secret`,
mais ce n'est **pas** un mécanisme d'authentification : il ne protège rien à lui seul, à réserver à un
serveur déjà privé (VPN, réseau interne, serveur mandataire authentifiant).

## In English

> [!IMPORTANT]
> The project's code is also hosted on my custom GitLab instance, available at [this address](https://git.florian-dev.fr/floriantrayon/Pericles-Initiative). The GitHub repository is a mirror of the GitLab repository, **automatically kept up to date**.
>
> **Public contributions remain on GitHub and are welcome**; validated pull requests will then be manually transferred to GitLab to be integrated. 🙂

### Introduction

This is a personal project I've been thinking about doing for a long time, but I couldn't find enough time to get it done. With a good amount of motivation and the help from artificial intelligence, I've finally been able to bring it to life. It's a website in the form of an encyclopaedia, similar to the famous [Wikipedia](https://fr.wikipedia.org/) website, which provides a simple way to create and document a fictional universe. This world-building is done using knowledge cards, which can be linked to one another, as well as to a timeline and real-time events, depending on your needs. So, here is **Périclès Initiative**! ☺️

Behind this slightly confusing name, which is a reference to an old personal [Google Sites](https://sites.google.com/) page I created for my role-playing sessions on the video game [Garry's Mod](https://fr.wikipedia.org/wiki/Garry%27s_Mod), lies the result of what I would have loved to have had a few years ago and which I'm going to have fun using for my new fiction projects. In terms of features, it includes all the essentials, such as a system for managing character sheets, timelines and events, translations, media management, synchronization and management of data from the encyclopaedia. Some features even remain available once you've left the website and are now offline, thanks to [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)! 🎀

Yes, you've guessed it: there's no authentication system or user management. The website is designed for personal use and isn't intended for use by multiple people. In fact, the GitLab Pages website hosted for this project is available to everyone for visibility purposes, but unless you have a specific use for it, it won't be of any use to you. Why? Because this website, which runs entirely within your browser, relies on data that can be imported via a [JSON](https://fr.wikipedia.org/wiki/JavaScript_Object_Notation) file or via an external backup server that you must provide. You can work without any of that, but your data won't leave your browser and others won't be able to see what you've done: everything is client-side, with no intermediaries, no database and no server. Life's good, isn't it? 😉

During the creation of this website, I tried to respect the values of digital sobriety, accessibility and privacy. The website is entirely static, contains no cookies or adverts, and does not use any tracking technology by default. It is also accessible to everyone, without restriction. Built entirely on [SvelteKit](https://svelte.dev/docs/kit) ❣️, [Vite](https://vite.dev/), [TailwindCSS](https://tailwindcss.com/) and [TypeScript](https://www.typescriptlang.org/), it utilizes modern, high-performance web technologies and is hosted on [GitLab Pages](https://docs.gitlab.com/user/project/pages/) to minimize its carbon footprint. 🌼

```mermaid
sequenceDiagram
    actor User
    participant Interface
    participant Local storage
    participant Interactive editor
    participant JSON file
    participant Online backup

    User->>Interface: I open the website
    Interface->>Local storage: Reads the overlay, once the page is hydrated
    Local storage-->>Interface: My entries, categories and events
    Interface-->>User: The home page, or an invitation to create if the wiki is empty

    User->>Interface: I browse the wiki, the categories, the timeline
    Interface-->>User: The entries, their backlinks and their related reads
    Interface-->>User: A red link whenever the target entry does not exist yet

    loop For every entry
        User->>Interactive editor: I create or edit an entry
        Interactive editor->>Local storage: Saves the entry into the overlay
        Local storage-->>User: The content, available right away and offline
    end

    User->>Interface: I publish an item in the live feed
    Interface-->>User: The feed reorders itself, and alerts the whole site when needed

    User->>Interface: I open the dashboard
    Interface-->>User: Figures, breakdowns, most cited entries, red links

    User->>JSON file: I export my data
    JSON file-->>User: A backup I can keep under version control
    User->>Interface: I import a file
    Interface->>Local storage: Replaces the whole content of the browser

    User->>Online backup: I push a snapshot, if I configured one
    Online backup-->>User: Where the synchronisation stands
    User->>Online backup: I pull the snapshot from another browser
    Online backup-->>Local storage: The whole dataset, reinstalled into the overlay
```

### Setup

> [!WARNING]
> Deployment in a production environment requires a pre-configured web server such as [Nginx](https://nginx.org/en/), [Apache](https://httpd.apache.org/), or [Caddy](https://caddyserver.com/) to serve the static files generated by Vite. ⚠️

#### Local development

- Install [Node.js LTS](https://nodejs.org/) (>22 or higher) ;
- Install project dependencies using `npm install` ;
- Start Vite local server using `npm run dev`.

#### Production deployment

- Install [Node.js LTS](https://nodejs.org/) (>22 or higher) ;
- Install project dependencies using `npm install` ;
- Build static website files using `npm run build` ;
- Remove development dependencies using `npm prune --omit=dev` ;
- Use a web server to serve the static files generated in the previous step.

#### Remote backup (optional)

The website can sync with an external HTTP server, optional and off by default: no network request is
ever sent until a base url is set on the `/data` page. The contract is minimal: `GET` and `PUT` on
`{baseUrl}/dataset` exchange the whole dataset as JSON, with no merging and no notion of a user. An
optional secret can be sent as the `X-Pericles-Secret` header, but it is **not** an authentication
mechanism: it protects nothing on its own, and belongs on a server that is already private (VPN,
internal network, authenticating proxy).

![image](static/assets/images/opengraph.png)
