-- players table
CREATE TABLE IF NOT EXISTS bingo.players (
    id serial UNIQUE PRIMARY KEY,
    username varchar(32) NOT NULL,
    expire timestamp DEFAULT (NOW() + interval '24 hours' )
);

-- lobbys table
CREATE TABLE IF NOT EXISTS bingo.lobbys (
    id serial UNIQUE PRIMARY KEY,
    admin_id serial references bingo.players(id) ON DELETE SET NULL,
    grid_size integer DEFAULT 3 NOT NULL,
    current_round integer,
    expire timestamp DEFAULT (NOW() + interval '1 hour' )
);

-- lobbys-players table
CREATE TABLE IF NOT EXISTS bingo.lobby_players (
    player_id serial references bingo.players(id) ON DELETE CASCADE,
    lobby_id serial references bingo.lobbys(id) ON DELETE CASCADE,
    score integer DEFAULT 0,
    PRIMARY KEY (player_id, lobby_id)
);

-- words table
CREATE TABLE IF NOT EXISTS bingo.words (
    id bigserial UNIQUE PRIMARY KEY,
    lobby_id serial references bingo.lobbys(id) ON DELETE CASCADE,
    heared integer DEFAULT 0 NOT NULL,
    content varchar(254) NOT NULL
);

-- messages table
CREATE TABLE IF NOT EXISTS bingo.messages (
    id bigserial UNIQUE PRIMARY KEY,
    content varchar(255) NOT NULL,
    player_id integer,
    lobby_id serial references bingo.lobbys(id) ON DELETE CASCADE,
    type varchar(8) DEFAULT 'USER' NOT NULL,
    created timestamp DEFAULT NOW()
);

-- rounds table
CREATE TABLE IF NOT EXISTS bingo.rounds (
    id serial UNIQUE PRIMARY KEY,
    start timestamp DEFAULT NOW(),
    finish timestamp,
    status varchar(8) DEFAULT 'ACTIVE',
    lobby_id serial references bingo.lobbys(id) ON DELETE CASCADE,
    winner integer
);

-- grids table
CREATE TABLE IF NOT EXISTS bingo.grids (
    id serial UNIQUE PRIMARY KEY,
    player_id serial references bingo.players(id) ON DELETE CASCADE,
    lobby_id serial references bingo.lobbys(id) ON DELETE CASCADE,
    round_id serial references bingo.rounds(id) ON DELETE CASCADE,
    UNIQUE(player_id, lobby_id, round_id)
);

-- grids_words table
CREATE TABLE IF NOT EXISTS bingo.grid_words (
    grid_id serial references bingo.grids(id) ON DELETE CASCADE,
    word_id serial references bingo.words(id) ON DELETE CASCADE,
    grid_row integer NOT NULL,
    grid_column integer NOT NULL,
    submitted boolean DEFAULT false,
    PRIMARY KEY (grid_id, grid_row, grid_column)
);

-- altering

ALTER TABLE bingo.messages ALTER COLUMN player_id DROP NOT NULL;
