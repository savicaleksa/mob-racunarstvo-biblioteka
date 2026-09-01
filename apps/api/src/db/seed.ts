import { Role } from "@repo/shared";
import { sql } from "drizzle-orm";

import { hashPasswordSync } from "../common/password-hashing";
import { createDatabase, type DrizzleDatabase } from "./connection";
import { authors, books, users } from "./schema";

/**
 * Database seed (ADR-0004, ADR-0012): a browseable Catalog of 100 real Books by
 * 76 real Authors, plus one demo account per role.
 *
 * The database file itself is never committed, so this script is what
 * reproduces a usable library from scratch on a fresh clone
 * (`pnpm --filter @repo/api db:reset`).
 *
 * Two independent seeds, deliberately kept separate:
 *
 * - {@link seedCatalog} — Authors + Books only. The e2e suite calls exactly
 *   this, so tests keep a users table they own (the first account a test
 *   registers is still the bootstrap Owner).
 * - {@link seedDemoUsers} — the three demo accounts (Owner / Librarian /
 *   Member). This one **claims the first-user bootstrap slot**: once it has run
 *   the users table is non-empty, so every subsequently registered account is a
 *   MEMBER. That is the point — a grader logs in as any of the three roles
 *   instead of having to register their way into them. ADR-0012 records the
 *   decision and revises the "no users are seeded" clause of ADR-0004/0006;
 *   the API-level invariant those set is untouched, because `PATCH
 *   /users/:id/role` still refuses `OWNER` as a target.
 *
 * Data notes: Authors carry a real birth year. `publishedYear` is the year of
 * first publication in the original language, while `isbn` — populated only
 * where a widely-circulated edition's ISBN-13 is known, and left null elsewhere
 * rather than invented — identifies an English-language edition, which for a
 * translated work is a later one. Both are checked on insert.
 *
 * Tokenized search (ADR-0009) is exercised end to end against "Fyodor
 * Dostoevsky": `fyo dos`, `Dostoevsky Fyodor` (reordered) and `yodo ostoe`
 * (mid-word) all resolve to that Author and their Books.
 */

interface SeedAuthor {
  name: string;
  bio: string | null;
  birthYear: number | null;
}

interface SeedBook {
  /** Matches a {@link SEED_AUTHORS} `name` — resolved to an id at insert time. */
  author: string;
  title: string;
  totalCopies: number;
  isbn: string | null;
  publishedYear: number | null;
  description: string | null;
}

const SEED_AUTHORS: SeedAuthor[] = [
  {
    name: "Fyodor Dostoevsky",
    bio: "Russian novelist whose psychological fiction probes faith, guilt and free will.",
    birthYear: 1821,
  },
  {
    name: "Leo Tolstoy",
    bio: "Russian novelist and moral philosopher, a founding figure of realist fiction.",
    birthYear: 1828,
  },
  {
    name: "Nikolai Gogol",
    bio: "Ukrainian-born Russian writer of satirical prose and grotesque comedy.",
    birthYear: 1809,
  },
  {
    name: "Vladimir Nabokov",
    bio: "Russian-American novelist and lepidopterist, celebrated for his prose in a second language.",
    birthYear: 1899,
  },
  {
    name: "Ivo Andric",
    bio: "Yugoslav novelist and 1961 Nobel laureate in Literature.",
    birthYear: 1892,
  },
  {
    name: "Mesa Selimovic",
    bio: "Bosnian-Yugoslav novelist best known for his Ottoman-era moral fiction.",
    birthYear: 1910,
  },
  {
    name: "Danilo Kis",
    bio: "Yugoslav writer of politically charged short fiction and autobiographical novels.",
    birthYear: 1935,
  },
  {
    name: "George Orwell",
    bio: "English novelist, essayist and journalist, a lifelong critic of totalitarianism.",
    birthYear: 1903,
  },
  {
    name: "Aldous Huxley",
    bio: "English writer and philosopher, author of a founding dystopia of the twentieth century.",
    birthYear: 1894,
  },
  {
    name: "Ray Bradbury",
    bio: "American writer of lyrical science fiction and fantasy.",
    birthYear: 1920,
  },
  {
    name: "Ursula K. Le Guin",
    bio: "American author of speculative fiction, whose anthropological worlds reshaped the genre.",
    birthYear: 1929,
  },
  {
    name: "Frank Herbert",
    bio: "American science-fiction writer, creator of the desert planet Arrakis.",
    birthYear: 1920,
  },
  {
    name: "Isaac Asimov",
    bio: "American writer and biochemist, author of hundreds of books across fiction and science.",
    birthYear: 1920,
  },
  {
    name: "Arthur C. Clarke",
    bio: "British science-fiction writer and futurist who proposed the geostationary satellite.",
    birthYear: 1917,
  },
  {
    name: "Philip K. Dick",
    bio: "American science-fiction writer preoccupied with identity, reality and paranoia.",
    birthYear: 1928,
  },
  {
    name: "William Gibson",
    bio: "American-Canadian writer who named cyberspace and defined cyberpunk.",
    birthYear: 1948,
  },
  {
    name: "Neal Stephenson",
    bio: "American writer of maximalist speculative fiction about code, money and history.",
    birthYear: 1959,
  },
  {
    name: "Octavia E. Butler",
    bio: "American science-fiction writer, the genre's first MacArthur Fellow.",
    birthYear: 1947,
  },
  {
    name: "N. K. Jemisin",
    bio: "American speculative-fiction writer, the first author to win the Hugo for Best Novel three years running.",
    birthYear: 1972,
  },
  {
    name: "Liu Cixin",
    bio: "Chinese science-fiction writer and computer engineer.",
    birthYear: 1963,
  },
  {
    name: "Andy Weir",
    bio: "American novelist and former programmer known for hard science fiction.",
    birthYear: 1972,
  },
  {
    name: "Douglas Adams",
    bio: "English humourist and dramatist, best known for a radio series that escaped into books.",
    birthYear: 1952,
  },
  {
    name: "J.R.R. Tolkien",
    bio: "English philologist and Oxford professor who invented the languages before the world.",
    birthYear: 1892,
  },
  {
    name: "George R. R. Martin",
    bio: "American novelist and screenwriter of epic fantasy.",
    birthYear: 1948,
  },
  {
    name: "Patrick Rothfuss",
    bio: "American fantasy writer known for a lyrical first-person frame narrative.",
    birthYear: 1973,
  },
  {
    name: "Neil Gaiman",
    bio: "English author of fantasy novels, comics and children's fiction.",
    birthYear: 1960,
  },
  {
    name: "Terry Pratchett",
    bio: "English satirist whose Discworld turned fantasy tropes inside out.",
    birthYear: 1948,
  },
  {
    name: "J.K. Rowling",
    bio: "British author of the best-selling children's series of the modern era.",
    birthYear: 1965,
  },
  {
    name: "C. S. Lewis",
    bio: "British writer, literary scholar and Christian apologist.",
    birthYear: 1898,
  },
  {
    name: "Lewis Carroll",
    bio: "English mathematician and author of nonsense literature.",
    birthYear: 1832,
  },
  {
    name: "Roald Dahl",
    bio: "British novelist and wartime pilot, author of darkly comic children's books.",
    birthYear: 1916,
  },
  {
    name: "Antoine de Saint-Exupery",
    bio: "French aviator and writer who disappeared on a reconnaissance flight in 1944.",
    birthYear: 1900,
  },
  {
    name: "Jane Austen",
    bio: "English novelist of manners, marriage and money in the landed gentry.",
    birthYear: 1775,
  },
  {
    name: "Charlotte Bronte",
    bio: "English novelist, eldest of the three surviving Bronte sisters.",
    birthYear: 1816,
  },
  {
    name: "Emily Bronte",
    bio: "English novelist and poet who published a single, violent masterpiece.",
    birthYear: 1818,
  },
  {
    name: "Charles Dickens",
    bio: "English novelist and social critic of Victorian London.",
    birthYear: 1812,
  },
  {
    name: "Mary Shelley",
    bio: "English writer who began the modern science-fiction novel at nineteen.",
    birthYear: 1797,
  },
  {
    name: "Bram Stoker",
    bio: "Irish author and theatre manager, creator of the definitive literary vampire.",
    birthYear: 1847,
  },
  {
    name: "Oscar Wilde",
    bio: "Irish poet and playwright, the wittiest man of late-Victorian London.",
    birthYear: 1854,
  },
  {
    name: "Victor Hugo",
    bio: "French novelist, poet and campaigner against the death penalty.",
    birthYear: 1802,
  },
  {
    name: "Alexandre Dumas",
    bio: "French author of historical adventure serialised for the popular press.",
    birthYear: 1802,
  },
  {
    name: "Herman Melville",
    bio: "American novelist and sailor whose whaling epic was rediscovered decades after his death.",
    birthYear: 1819,
  },
  {
    name: "Mark Twain",
    bio: "American humourist and riverboat pilot, father of the American vernacular novel.",
    birthYear: 1835,
  },
  {
    name: "F. Scott Fitzgerald",
    bio: "American chronicler of the Jazz Age and its disappointments.",
    birthYear: 1896,
  },
  {
    name: "Ernest Hemingway",
    bio: "American novelist and reporter whose stripped-back prose reshaped the sentence.",
    birthYear: 1899,
  },
  {
    name: "John Steinbeck",
    bio: "American novelist of migrant labour and the California valleys.",
    birthYear: 1902,
  },
  {
    name: "Harper Lee",
    bio: "American novelist from Monroeville, Alabama, who published two novels fifty-five years apart.",
    birthYear: 1926,
  },
  {
    name: "J. D. Salinger",
    bio: "American writer who withdrew from publication for the last half of his life.",
    birthYear: 1919,
  },
  {
    name: "Toni Morrison",
    bio: "American novelist and editor, 1993 Nobel laureate in Literature.",
    birthYear: 1931,
  },
  {
    name: "Ralph Ellison",
    bio: "American novelist and critic, author of a single defining novel.",
    birthYear: 1914,
  },
  {
    name: "James Baldwin",
    bio: "American novelist and essayist on race, class and desire.",
    birthYear: 1924,
  },
  {
    name: "Maya Angelou",
    bio: "American memoirist, poet and civil-rights activist.",
    birthYear: 1928,
  },
  {
    name: "Alice Walker",
    bio: "American novelist and poet, the first Black woman to win the Pulitzer Prize for Fiction.",
    birthYear: 1944,
  },
  {
    name: "Kurt Vonnegut",
    bio: "American satirist and prisoner of war at the firebombing of Dresden.",
    birthYear: 1922,
  },
  {
    name: "Joseph Heller",
    bio: "American novelist and bombardier whose debut named a logical trap.",
    birthYear: 1923,
  },
  {
    name: "William Golding",
    bio: "British novelist and schoolmaster, 1983 Nobel laureate in Literature.",
    birthYear: 1911,
  },
  {
    name: "Anthony Burgess",
    bio: "English writer, composer and linguist who invented a teenage argot.",
    birthYear: 1917,
  },
  {
    name: "Cormac McCarthy",
    bio: "American novelist of the borderlands and the apocalypse, sparing with punctuation.",
    birthYear: 1933,
  },
  {
    name: "Margaret Atwood",
    bio: "Canadian novelist, poet and inventor, a two-time Booker Prize winner.",
    birthYear: 1939,
  },
  {
    name: "Kazuo Ishiguro",
    bio: "British novelist born in Nagasaki, 2017 Nobel laureate in Literature.",
    birthYear: 1954,
  },
  {
    name: "Haruki Murakami",
    bio: "Japanese novelist, translator and long-distance runner.",
    birthYear: 1949,
  },
  {
    name: "Franz Kafka",
    bio: "Bohemian writer and insurance clerk who asked that his manuscripts be burned.",
    birthYear: 1883,
  },
  {
    name: "Albert Camus",
    bio: "French-Algerian novelist and philosopher of the absurd, 1957 Nobel laureate.",
    birthYear: 1913,
  },
  {
    name: "Gabriel Garcia Marquez",
    bio: "Colombian novelist and journalist, the central figure of magical realism.",
    birthYear: 1927,
  },
  {
    name: "Jorge Luis Borges",
    bio: "Argentine writer and librarian of labyrinths, mirrors and infinite books.",
    birthYear: 1899,
  },
  {
    name: "Italo Calvino",
    bio: "Italian writer of fables, combinatorial fiction and invented cities.",
    birthYear: 1923,
  },
  {
    name: "Umberto Eco",
    bio: "Italian semiotician and novelist of medieval scholarship and conspiracy.",
    birthYear: 1932,
  },
  {
    name: "Milan Kundera",
    bio: "Czech-French novelist exiled after the 1968 Prague Spring.",
    birthYear: 1929,
  },
  {
    name: "Agatha Christie",
    bio: "English crime writer, the best-selling novelist of all time.",
    birthYear: 1890,
  },
  {
    name: "Arthur Conan Doyle",
    bio: "Scottish physician and writer who created the world's first consulting detective.",
    birthYear: 1859,
  },
  {
    name: "Stephen King",
    bio: "American author of horror, suspense and supernatural fiction.",
    birthYear: 1947,
  },
  {
    name: "Khaled Hosseini",
    bio: "Afghan-American novelist and physician, a UNHCR goodwill ambassador.",
    birthYear: 1965,
  },
  {
    name: "Yuval Noah Harari",
    bio: "Israeli historian at the Hebrew University of Jerusalem.",
    birthYear: 1976,
  },
  {
    name: "Stephen Hawking",
    bio: "English theoretical physicist and cosmologist at the University of Cambridge.",
    birthYear: 1942,
  },
  {
    name: "Carl Sagan",
    bio: "American astronomer and science communicator who brought planetary science to television.",
    birthYear: 1934,
  },
  {
    name: "Anne Frank",
    bio: "German-born diarist who wrote in hiding in Amsterdam between 1942 and 1944.",
    birthYear: 1929,
  },
];

const SEED_BOOKS: SeedBook[] = [
  {
    author: "Fyodor Dostoevsky",
    title: "Crime and Punishment",
    totalCopies: 4,
    isbn: "978-0-14-044913-6",
    publishedYear: 1866,
    description:
      "A destitute student murders a pawnbroker to test a theory about himself, then spends the novel being examined by his own conscience.",
  },
  {
    author: "Fyodor Dostoevsky",
    title: "The Brothers Karamazov",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1880,
    description:
      "Three brothers, a murdered father, and the trial that forces each to answer for what he believes.",
  },
  {
    author: "Leo Tolstoy",
    title: "War and Peace",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1869,
    description:
      "Five aristocratic families live through the Napoleonic invasion of Russia.",
  },
  {
    author: "Leo Tolstoy",
    title: "Anna Karenina",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1878,
    description:
      "A married woman's affair with a cavalry officer, set against a parallel story of a landowner learning to farm.",
  },
  {
    author: "Nikolai Gogol",
    title: "Dead Souls",
    totalCopies: 2,
    isbn: null,
    publishedYear: 1842,
    description:
      "A swindler tours the provinces buying up the names of serfs who have died but are still taxed as living.",
  },
  {
    author: "Vladimir Nabokov",
    title: "Pale Fire",
    totalCopies: 1,
    isbn: null,
    publishedYear: 1962,
    description:
      "A 999-line poem and the deranged commentary of the neighbour who appointed himself its editor.",
  },
  {
    author: "Ivo Andric",
    title: "The Bridge on the Drina",
    totalCopies: 4,
    isbn: "978-0-226-02045-7",
    publishedYear: 1945,
    description:
      "A chronicle of the bridge at Visegrad across four centuries of Ottoman and Austro-Hungarian rule.",
  },
  {
    author: "Ivo Andric",
    title: "Bosnian Chronicle",
    totalCopies: 2,
    isbn: null,
    publishedYear: 1945,
    description:
      "Foreign consuls manoeuvre in Napoleonic-era Travnik, a town that wants none of them.",
  },
  {
    author: "Mesa Selimovic",
    title: "Death and the Dervish",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1966,
    description:
      "A sheikh of a Sarajevo tekke petitions an Ottoman bureaucracy that has arrested his brother without charge.",
  },
  {
    author: "Danilo Kis",
    title: "A Tomb for Boris Davidovich",
    totalCopies: 2,
    isbn: null,
    publishedYear: 1976,
    description:
      "Seven invented biographies of revolutionaries consumed by the revolution they served.",
  },
  {
    author: "George Orwell",
    title: "Nineteen Eighty-Four",
    totalCopies: 5,
    isbn: "978-0-451-52493-5",
    publishedYear: 1949,
    description:
      "Winston Smith edits the past for a Party that intends to own the future, and keeps a diary anyway.",
  },
  {
    author: "George Orwell",
    title: "Animal Farm",
    totalCopies: 5,
    isbn: "978-0-452-28424-1",
    publishedYear: 1945,
    description:
      "The animals expel the farmer and write seven commandments, of which one survives, amended.",
  },
  {
    author: "Aldous Huxley",
    title: "Brave New World",
    totalCopies: 4,
    isbn: "978-0-06-085052-4",
    publishedYear: 1932,
    description:
      "A society engineered for contentment, and the two men who find they cannot be content in it.",
  },
  {
    author: "Ray Bradbury",
    title: "Fahrenheit 451",
    totalCopies: 4,
    isbn: "978-1-451-67331-9",
    publishedYear: 1953,
    description: "A fireman whose job is burning books begins to keep them.",
  },
  {
    author: "Ursula K. Le Guin",
    title: "A Wizard of Earthsea",
    totalCopies: 3,
    isbn: "978-0-547-72202-3",
    publishedYear: 1968,
    description:
      "A gifted boy on an archipelago world looses something nameless and must chase it to the edge of the map.",
  },
  {
    author: "Ursula K. Le Guin",
    title: "The Left Hand of Darkness",
    totalCopies: 2,
    isbn: "978-0-441-47812-5",
    publishedYear: 1969,
    description:
      "An envoy to a permanently wintered planet whose inhabitants have no fixed sex.",
  },
  {
    author: "Frank Herbert",
    title: "Dune",
    totalCopies: 4,
    isbn: "978-0-441-01359-3",
    publishedYear: 1965,
    description:
      "A ducal heir is exiled to the desert planet that supplies the empire's most valuable substance.",
  },
  {
    author: "Isaac Asimov",
    title: "Foundation",
    totalCopies: 3,
    isbn: "978-0-553-29335-7",
    publishedYear: 1951,
    description:
      "A mathematician predicts the fall of a galactic empire and plants a colony to shorten the dark age that follows.",
  },
  {
    author: "Isaac Asimov",
    title: "I, Robot",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1950,
    description:
      "Nine linked stories in which the Three Laws of Robotics behave exactly as written and not at all as intended.",
  },
  {
    author: "Arthur C. Clarke",
    title: "2001: A Space Odyssey",
    totalCopies: 2,
    isbn: null,
    publishedYear: 1968,
    description:
      "A monolith, a mission to Jupiter, and a shipboard computer with irreconcilable orders.",
  },
  {
    author: "Philip K. Dick",
    title: "Do Androids Dream of Electric Sheep?",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1968,
    description:
      "A bounty hunter retires escaped androids in a San Francisco where owning a live animal is the last status symbol.",
  },
  {
    author: "William Gibson",
    title: "Neuromancer",
    totalCopies: 2,
    isbn: "978-0-441-56956-4",
    publishedYear: 1984,
    description:
      "A burned-out console cowboy gets his nervous system repaired in exchange for one last run.",
  },
  {
    author: "Neal Stephenson",
    title: "Snow Crash",
    totalCopies: 2,
    isbn: "978-0-553-38095-8",
    publishedYear: 1992,
    description:
      "A hacker and a teenage courier chase a drug that is also a virus that is also a language.",
  },
  {
    author: "Octavia E. Butler",
    title: "Kindred",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1979,
    description:
      "A Black writer in 1976 Los Angeles is pulled repeatedly into an antebellum Maryland plantation.",
  },
  {
    author: "Octavia E. Butler",
    title: "Parable of the Sower",
    totalCopies: 2,
    isbn: null,
    publishedYear: 1993,
    description:
      "A young woman with a disabling empathy walks north through a collapsing California, writing a new scripture.",
  },
  {
    author: "N. K. Jemisin",
    title: "The Fifth Season",
    totalCopies: 2,
    isbn: null,
    publishedYear: 2015,
    description:
      "A continent that ends the world on a schedule, and the people whose geological power is both leash and weapon.",
  },
  {
    author: "Liu Cixin",
    title: "The Three-Body Problem",
    totalCopies: 3,
    isbn: "978-0-7653-7706-7",
    publishedYear: 2008,
    description:
      "A secret military project during the Cultural Revolution answers a question humanity should perhaps not have asked.",
  },
  {
    author: "Andy Weir",
    title: "The Martian",
    totalCopies: 4,
    isbn: "978-0-8041-3902-1",
    publishedYear: 2011,
    description:
      "An astronaut left for dead on Mars keeps himself alive with botany, arithmetic and salvage.",
  },
  {
    author: "Andy Weir",
    title: "Project Hail Mary",
    totalCopies: 3,
    isbn: null,
    publishedYear: 2021,
    description:
      "A man wakes alone on an interstellar ship with no memory of why he is the last chance.",
  },
  {
    author: "Douglas Adams",
    title: "The Hitchhiker's Guide to the Galaxy",
    totalCopies: 4,
    isbn: "978-0-345-39180-3",
    publishedYear: 1979,
    description:
      "Earth is demolished for a bypass; a man in a dressing gown survives with a towel and a guidebook.",
  },
  {
    author: "J.R.R. Tolkien",
    title: "The Hobbit",
    totalCopies: 5,
    isbn: "978-0-345-33968-3",
    publishedYear: 1937,
    description:
      "A comfortable hobbit is recruited as a burglar by thirteen dwarves and a wizard.",
  },
  {
    author: "J.R.R. Tolkien",
    title: "The Fellowship of the Ring",
    totalCopies: 4,
    isbn: null,
    publishedYear: 1954,
    description:
      "Nine companions set out from Rivendell to carry a ring to the one place it can be destroyed.",
  },
  {
    author: "George R. R. Martin",
    title: "A Game of Thrones",
    totalCopies: 4,
    isbn: null,
    publishedYear: 1996,
    description:
      "Great houses manoeuvre for a kingdom while something older gathers beyond its northern wall.",
  },
  {
    author: "Patrick Rothfuss",
    title: "The Name of the Wind",
    totalCopies: 3,
    isbn: "978-0-7564-0474-1",
    publishedYear: 2007,
    description:
      "An innkeeper with a hidden past dictates the true version of his own legend over three days.",
  },
  {
    author: "Neil Gaiman",
    title: "American Gods",
    totalCopies: 3,
    isbn: null,
    publishedYear: 2001,
    description:
      "The gods immigrants brought with them are losing ground to the ones America built for itself.",
  },
  {
    author: "Terry Pratchett",
    title: "Mort",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1987,
    description:
      "Death takes an apprentice, who promptly saves someone he was sent to collect.",
  },
  {
    author: "J.K. Rowling",
    title: "Harry Potter and the Philosopher's Stone",
    totalCopies: 5,
    isbn: null,
    publishedYear: 1997,
    description:
      "An orphan learns on his eleventh birthday that he is a wizard, and that his parents were murdered.",
  },
  {
    author: "J.K. Rowling",
    title: "Harry Potter and the Chamber of Secrets",
    totalCopies: 4,
    isbn: null,
    publishedYear: 1998,
    description:
      "Something is petrifying students at Hogwarts, and the school's own history is the clue.",
  },
  {
    author: "C. S. Lewis",
    title: "The Lion, the Witch and the Wardrobe",
    totalCopies: 4,
    isbn: null,
    publishedYear: 1950,
    description:
      "Four evacuated children step through a wardrobe into a country held in permanent winter.",
  },
  {
    author: "Lewis Carroll",
    title: "Alice's Adventures in Wonderland",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1865,
    description:
      "A girl follows a waistcoated rabbit underground into a world run on rigorous nonsense.",
  },
  {
    author: "Roald Dahl",
    title: "Matilda",
    totalCopies: 4,
    isbn: null,
    publishedYear: 1988,
    description:
      "A brilliant child with negligent parents and a tyrannical headmistress discovers she can move things with her mind.",
  },
  {
    author: "Roald Dahl",
    title: "Charlie and the Chocolate Factory",
    totalCopies: 4,
    isbn: null,
    publishedYear: 1964,
    description:
      "Five children win a tour of a secretive factory; four of them do not follow instructions.",
  },
  {
    author: "Antoine de Saint-Exupery",
    title: "The Little Prince",
    totalCopies: 4,
    isbn: null,
    publishedYear: 1943,
    description:
      "A pilot stranded in the Sahara meets a boy from an asteroid who is worried about his rose.",
  },
  {
    author: "Jane Austen",
    title: "Pride and Prejudice",
    totalCopies: 4,
    isbn: null,
    publishedYear: 1813,
    description:
      "Elizabeth Bennet and Mr Darcy each mistake the other, at length and to the reader's benefit.",
  },
  {
    author: "Jane Austen",
    title: "Emma",
    totalCopies: 2,
    isbn: null,
    publishedYear: 1815,
    description:
      "A wealthy young woman with no need to marry arranges everyone else's matches, badly.",
  },
  {
    author: "Charlotte Bronte",
    title: "Jane Eyre",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1847,
    description:
      "A governess at Thornfield Hall refuses to be anyone's secret.",
  },
  {
    author: "Emily Bronte",
    title: "Wuthering Heights",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1847,
    description:
      "Two families on the Yorkshire moors are ruined across two generations by one man's grievance.",
  },
  {
    author: "Charles Dickens",
    title: "Great Expectations",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1861,
    description:
      "An orphan comes into money from an anonymous benefactor and mistakes where it came from.",
  },
  {
    author: "Charles Dickens",
    title: "A Tale of Two Cities",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1859,
    description:
      "London and Paris before and during the Terror, and a substitution at the scaffold.",
  },
  {
    author: "Mary Shelley",
    title: "Frankenstein",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1818,
    description:
      "A student assembles a living man and abandons him within an hour of success.",
  },
  {
    author: "Bram Stoker",
    title: "Dracula",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1897,
    description:
      "A Transylvanian count buys property in London, told entirely through letters, diaries and clippings.",
  },
  {
    author: "Oscar Wilde",
    title: "The Picture of Dorian Gray",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1890,
    description: "A portrait ages and corrupts while its subject does not.",
  },
  {
    author: "Victor Hugo",
    title: "Les Miserables",
    totalCopies: 2,
    isbn: null,
    publishedYear: 1862,
    description:
      "A paroled convict remakes himself while a policeman who cannot accept that pursues him for decades.",
  },
  {
    author: "Alexandre Dumas",
    title: "The Count of Monte Cristo",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1844,
    description:
      "A sailor imprisoned on a false charge escapes, finds a fortune, and returns under a title.",
  },
  {
    author: "Herman Melville",
    title: "Moby-Dick",
    totalCopies: 2,
    isbn: null,
    publishedYear: 1851,
    description:
      "A whaling voyage, a captain's grudge against a white whale, and a great deal of cetology.",
  },
  {
    author: "Mark Twain",
    title: "The Adventures of Huckleberry Finn",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1884,
    description:
      "A boy and an escaping enslaved man raft down the Mississippi, and the boy decides to go to hell.",
  },
  {
    author: "F. Scott Fitzgerald",
    title: "The Great Gatsby",
    totalCopies: 4,
    isbn: "978-0-7432-7356-5",
    publishedYear: 1925,
    description:
      "A bond salesman narrates his neighbour's parties, and what the parties were actually for.",
  },
  {
    author: "Ernest Hemingway",
    title: "The Old Man and the Sea",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1952,
    description:
      "An old Cuban fisherman hooks a marlin far out in the Gulf Stream and cannot bring it home whole.",
  },
  {
    author: "Ernest Hemingway",
    title: "A Farewell to Arms",
    totalCopies: 2,
    isbn: null,
    publishedYear: 1929,
    description:
      "An American ambulance driver on the Italian front deserts with the nurse he loves.",
  },
  {
    author: "John Steinbeck",
    title: "The Grapes of Wrath",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1939,
    description:
      "The Joads leave a foreclosed Oklahoma farm for California, where the handbills lied.",
  },
  {
    author: "John Steinbeck",
    title: "Of Mice and Men",
    totalCopies: 4,
    isbn: null,
    publishedYear: 1937,
    description:
      "Two itinerant ranch hands keep telling each other about the farm they will buy.",
  },
  {
    author: "Harper Lee",
    title: "To Kill a Mockingbird",
    totalCopies: 5,
    isbn: "978-0-06-112008-4",
    publishedYear: 1960,
    description:
      "A small-town Alabama lawyer defends a Black man against a charge everyone has already decided.",
  },
  {
    author: "J. D. Salinger",
    title: "The Catcher in the Rye",
    totalCopies: 4,
    isbn: "978-0-316-76948-8",
    publishedYear: 1951,
    description:
      "Three days in New York with a sixteen-year-old who has just been expelled again.",
  },
  {
    author: "Toni Morrison",
    title: "Beloved",
    totalCopies: 3,
    isbn: "978-1-4000-3341-6",
    publishedYear: 1987,
    description:
      "A house outside Cincinnati is haunted by a daughter its owner killed to keep out of slavery.",
  },
  {
    author: "Toni Morrison",
    title: "Song of Solomon",
    totalCopies: 2,
    isbn: null,
    publishedYear: 1977,
    description:
      "A man nicknamed Milkman goes south looking for gold and finds his family's name instead.",
  },
  {
    author: "Ralph Ellison",
    title: "Invisible Man",
    totalCopies: 2,
    isbn: null,
    publishedYear: 1952,
    description:
      "An unnamed narrator recounts his passage through the institutions that refused to see him.",
  },
  {
    author: "James Baldwin",
    title: "Giovanni's Room",
    totalCopies: 2,
    isbn: null,
    publishedYear: 1956,
    description:
      "An American in Paris cannot admit what he wants until it has cost someone else everything.",
  },
  {
    author: "Maya Angelou",
    title: "I Know Why the Caged Bird Sings",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1969,
    description:
      "The first volume of an autobiography, from Stamps, Arkansas to a teenage motherhood in California.",
  },
  {
    author: "Alice Walker",
    title: "The Color Purple",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1982,
    description:
      "Letters written by a Black woman in rural Georgia, first to God and then to her sister.",
  },
  {
    author: "Kurt Vonnegut",
    title: "Slaughterhouse-Five",
    totalCopies: 3,
    isbn: "978-0-385-33384-9",
    publishedYear: 1969,
    description:
      "Billy Pilgrim comes unstuck in time, between Dresden in 1945 and a zoo on Tralfamadore.",
  },
  {
    author: "Kurt Vonnegut",
    title: "Cat's Cradle",
    totalCopies: 2,
    isbn: null,
    publishedYear: 1963,
    description:
      "A substance that freezes water at room temperature, and a religion founded on useful lies.",
  },
  {
    author: "Joseph Heller",
    title: "Catch-22",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1961,
    description:
      "A bombardier tries to be grounded for insanity, and discovers the regulation that makes it impossible.",
  },
  {
    author: "William Golding",
    title: "Lord of the Flies",
    totalCopies: 4,
    isbn: null,
    publishedYear: 1954,
    description:
      "Schoolboys marooned on an island build a society and then dismantle it.",
  },
  {
    author: "Anthony Burgess",
    title: "A Clockwork Orange",
    totalCopies: 2,
    isbn: null,
    publishedYear: 1962,
    description:
      "A violent teenager is conditioned out of his free will, and the state calls it a cure.",
  },
  {
    author: "Cormac McCarthy",
    title: "The Road",
    totalCopies: 3,
    isbn: "978-0-307-38789-9",
    publishedYear: 2006,
    description:
      "A father and son push a shopping cart south through ash, carrying the fire.",
  },
  {
    author: "Cormac McCarthy",
    title: "Blood Meridian",
    totalCopies: 1,
    isbn: null,
    publishedYear: 1985,
    description:
      "A scalp-hunting gang rides the Texas-Mexico borderlands in the 1840s, led by an unkillable judge.",
  },
  {
    author: "Margaret Atwood",
    title: "The Handmaid's Tale",
    totalCopies: 4,
    isbn: "978-0-385-49081-8",
    publishedYear: 1985,
    description:
      "In the Republic of Gilead a woman is assigned to a household for the single purpose of bearing its child.",
  },
  {
    author: "Margaret Atwood",
    title: "Oryx and Crake",
    totalCopies: 2,
    isbn: null,
    publishedYear: 2003,
    description:
      "The last man alive reconstructs how his best friend engineered the end of the species.",
  },
  {
    author: "Kazuo Ishiguro",
    title: "Never Let Me Go",
    totalCopies: 3,
    isbn: "978-1-4000-7877-6",
    publishedYear: 2005,
    description:
      "Three friends from an English boarding school gradually understand what they were raised for.",
  },
  {
    author: "Kazuo Ishiguro",
    title: "The Remains of the Day",
    totalCopies: 2,
    isbn: null,
    publishedYear: 1989,
    description:
      "An English butler drives west on a short holiday and audits a lifetime of dignified service.",
  },
  {
    author: "Haruki Murakami",
    title: "Norwegian Wood",
    totalCopies: 3,
    isbn: "978-0-375-70402-4",
    publishedYear: 1987,
    description:
      "A Tokyo student in 1969 is caught between a woman he owes and a woman he wants.",
  },
  {
    author: "Haruki Murakami",
    title: "Kafka on the Shore",
    totalCopies: 3,
    isbn: "978-1-4000-7927-8",
    publishedYear: 2002,
    description:
      "A runaway teenager and an old man who talks to cats converge on a private library in Takamatsu.",
  },
  {
    author: "Franz Kafka",
    title: "The Trial",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1925,
    description: "Josef K. is arrested one morning and never told the charge.",
  },
  {
    author: "Franz Kafka",
    title: "The Metamorphosis",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1915,
    description:
      "A travelling salesman wakes as an insect and worries chiefly about missing his train.",
  },
  {
    author: "Albert Camus",
    title: "The Stranger",
    totalCopies: 4,
    isbn: null,
    publishedYear: 1942,
    description:
      "A clerk in Algiers kills a man on a beach and is convicted, in effect, of not weeping at his mother's funeral.",
  },
  {
    author: "Albert Camus",
    title: "The Plague",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1947,
    description:
      "Oran is sealed off by an epidemic, and a doctor keeps working without expecting to win.",
  },
  {
    author: "Gabriel Garcia Marquez",
    title: "One Hundred Years of Solitude",
    totalCopies: 4,
    isbn: "978-0-06-088328-7",
    publishedYear: 1967,
    description:
      "Seven generations of the Buendia family found, populate and lose the town of Macondo.",
  },
  {
    author: "Gabriel Garcia Marquez",
    title: "Love in the Time of Cholera",
    totalCopies: 2,
    isbn: null,
    publishedYear: 1985,
    description:
      "A man waits fifty-one years, nine months and four days for a widow to become available.",
  },
  {
    author: "Jorge Luis Borges",
    title: "Ficciones",
    totalCopies: 2,
    isbn: null,
    publishedYear: 1944,
    description:
      "Short fictions disguised as reviews, footnotes and encyclopaedia entries for books that do not exist.",
  },
  {
    author: "Italo Calvino",
    title: "Invisible Cities",
    totalCopies: 2,
    isbn: null,
    publishedYear: 1972,
    description:
      "Marco Polo describes fifty-five cities to Kublai Khan, and may be describing only one.",
  },
  {
    author: "Umberto Eco",
    title: "The Name of the Rose",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1980,
    description:
      "A Franciscan friar investigates deaths in a Benedictine abbey whose library is a labyrinth.",
  },
  {
    author: "Milan Kundera",
    title: "The Unbearable Lightness of Being",
    totalCopies: 2,
    isbn: null,
    publishedYear: 1984,
    description:
      "Four lives in Prague around 1968, weighed against the idea that nothing recurs.",
  },
  {
    author: "Agatha Christie",
    title: "Murder on the Orient Express",
    totalCopies: 4,
    isbn: null,
    publishedYear: 1934,
    description:
      "A passenger is stabbed twelve times on a train stopped by snow, and everyone has an alibi.",
  },
  {
    author: "Arthur Conan Doyle",
    title: "The Hound of the Baskervilles",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1902,
    description:
      "A family curse on Dartmoor, a spectral hound, and a detective who declines to believe in either.",
  },
  {
    author: "Stephen King",
    title: "The Shining",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1977,
    description:
      "A recovering alcoholic takes a winter caretaking job at a hotel that has been waiting for his son.",
  },
  {
    author: "Khaled Hosseini",
    title: "The Kite Runner",
    totalCopies: 3,
    isbn: "978-1-59463-193-1",
    publishedYear: 2003,
    description:
      "A boy in Kabul betrays his closest friend, and spends his adult life looking for a way back.",
  },
  {
    author: "Yuval Noah Harari",
    title: "Sapiens: A Brief History of Humankind",
    totalCopies: 4,
    isbn: "978-0-06-231609-7",
    publishedYear: 2011,
    description:
      "A single-volume account of how one human species out of several ended up running the planet.",
  },
  {
    author: "Stephen Hawking",
    title: "A Brief History of Time",
    totalCopies: 3,
    isbn: "978-0-553-38016-3",
    publishedYear: 1988,
    description:
      "Cosmology from the Big Bang to black holes, written for readers with no mathematics.",
  },
  {
    author: "Carl Sagan",
    title: "Cosmos",
    totalCopies: 3,
    isbn: null,
    publishedYear: 1980,
    description:
      "The companion volume to the television series, on the universe and how we came to measure it.",
  },
  {
    author: "Anne Frank",
    title: "The Diary of a Young Girl",
    totalCopies: 4,
    isbn: null,
    publishedYear: 1947,
    description:
      "Two years of diary entries written in a concealed annexe in occupied Amsterdam.",
  },
];

interface SeedUser {
  email: string;
  role: Role;
}

/** The shared password of every demo account created by {@link seedDemoUsers}. */
const DEMO_PASSWORD = "password123";

const SEED_USERS: SeedUser[] = [
  { email: "owner@example.com", role: Role.OWNER },
  { email: "librarian@example.com", role: Role.LIBRARIAN },
  { email: "member@example.com", role: Role.MEMBER },
];

/**
 * Reject a seed Book whose ISBN is not a well-formed ISBN-13.
 *
 * The check digit is the whole point: it catches exactly the transcription slip
 * this data is prone to — a digit typed wrong while copying an ISBN off a book —
 * which is otherwise invisible, because no DTO validates the column and nothing
 * downstream parses it. `null` is fine and expected (see the file header).
 */
function assertValidIsbn13(book: SeedBook): void {
  if (book.isbn === null) {
    return;
  }

  const digits = book.isbn.replace(/-/g, "");
  const wellFormed =
    /^\d{13}$/.test(digits) &&
    digits
      .split("")
      .reduce(
        (sum, digit, index) => sum + Number(digit) * (index % 2 ? 3 : 1),
        0,
      ) %
      10 ===
      0;

  if (!wellFormed) {
    throw new Error(
      `Seed book "${book.title}" has a malformed ISBN-13: ${book.isbn}.`,
    );
  }
}

/**
 * Insert the Catalog fixtures into `db`. Idempotent: if the Catalog is already
 * populated (any Author present) it does nothing, so re-running the seed on an
 * existing database is safe and never duplicates rows. Returns the number of
 * Authors and Books inserted.
 */
export function seedCatalog(db: DrizzleDatabase): {
  authors: number;
  books: number;
} {
  const existing = db
    .select({ count: sql<number>`count(*)` })
    .from(authors)
    .get();

  if ((existing?.count ?? 0) > 0) {
    return { authors: 0, books: 0 };
  }

  const authorIdsByName = new Map<string, number>();
  for (const author of SEED_AUTHORS) {
    const inserted = db
      .insert(authors)
      .values(author)
      .returning({ id: authors.id })
      .get();
    authorIdsByName.set(author.name, inserted.id);
  }

  for (const book of SEED_BOOKS) {
    const authorId = authorIdsByName.get(book.author);
    if (authorId === undefined) {
      // A typo in a Book's `author` would otherwise fail deep inside SQLite as
      // a foreign-key violation; name the offending row instead.
      throw new Error(
        `Seed book "${book.title}" names unknown Author "${book.author}".`,
      );
    }

    assertValidIsbn13(book);

    db.insert(books)
      .values({
        title: book.title,
        authorId,
        totalCopies: book.totalCopies,
        isbn: book.isbn,
        publishedYear: book.publishedYear,
        description: book.description,
      })
      .run();
  }

  return { authors: SEED_AUTHORS.length, books: SEED_BOOKS.length };
}

/**
 * Insert one demo account per role, all sharing {@link DEMO_PASSWORD}, hashed
 * by the same `hashPassword` the register route uses so they log in through the
 * ordinary `POST /auth/login` route.
 *
 * Idempotent like {@link seedCatalog}: skipped entirely if any user already
 * exists, so it never collides with the unique email index or overwrites a real
 * account.
 *
 * This is the half that claims the first-user bootstrap slot (ADR-0012) — see
 * the file header. It is deliberately NOT part of {@link seedCatalog}, so the
 * e2e suite can keep seeding a Catalog into an empty users table.
 */
export function seedDemoUsers(db: DrizzleDatabase): { users: number } {
  const existing = db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .get();

  if ((existing?.count ?? 0) > 0) {
    return { users: 0 };
  }

  // The same hashing the register route uses, so these accounts log in through
  // the ordinary credential check.
  const passwordHash = hashPasswordSync(DEMO_PASSWORD);

  for (const user of SEED_USERS) {
    db.insert(users)
      .values({ email: user.email, passwordHash, role: user.role })
      .run();
  }

  return { users: SEED_USERS.length };
}

/** Seed the Catalog and the demo accounts. Both halves are idempotent. */
export function seedAll(db: DrizzleDatabase): {
  authors: number;
  books: number;
  users: number;
} {
  const catalog = seedCatalog(db);
  const { users: seededUsers } = seedDemoUsers(db);
  return { ...catalog, users: seededUsers };
}

/**
 * CLI entry point: `pnpm --filter @repo/api db:seed`. Opens the real
 * (env/file) database, applies migrations, seeds Catalog + demo users, reports.
 */
function main(): void {
  const db = createDatabase();
  const result = seedAll(db);
  if (result.authors === 0 && result.books === 0 && result.users === 0) {
    console.log("Database already seeded; nothing to do.");
  } else {
    console.log(
      `Seeded ${result.authors} authors, ${result.books} books, ${result.users} users.`,
    );
  }
}

// Only run when executed directly (not when imported by tests).
if (require.main === module) {
  main();
}
