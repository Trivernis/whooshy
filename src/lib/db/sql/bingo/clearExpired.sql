/*-- remove grid-word connections for expired lobbys
DELETE FROM bingo.grid_words
WHERE EXISTS(
    SELECT grids.lobby_id FROM bingo.grids
    WHERE EXISTS (
        SELECT lobbys.id FROM bingo.lobbys
        WHERE lobbys.id = grids.lobby_id
        AND NOW() > lobbys.expire
    )
);

-- remove grids for expired lobbys
DELETE FROM bingo.grids
WHERE EXISTS (
    SELECT lobbys.id FROM bingo.lobbys
    WHERE lobbys.id = grids.lobby_id
    AND NOW() > lobbys.expire
);

-- remove words for expired lobbys
DELETE FROM bingo.words
WHERE EXISTS (
    SELECT lobbys.id FROM bingo.lobbys
    WHERE lobbys.id = words.lobby_id
    AND NOW() > lobbys.expire
);

-- remove lobby-player connections for expired lobbys or players
DELETE FROM bingo.lobby_players
WHERE EXISTS (
    SELECT lobbys.id FROM bingo.lobbys
    WHERE lobbys.id = lobby_players.lobby_id
    AND NOW() > lobbys.expire
) OR EXISTS (
    SELECT players.id FROM bingo.players
    WHERE players.id = lobby_players.player_id
    AND NOW() > players.expire
);
*/
-- remove expired lobbys
DELETE FROM bingo.lobbys
WHERE NOW() > lobbys.expire;

-- remove expired players
DELETE FROM bingo.players
WHERE NOW() > players.expire;
/*AND NOT EXISTS (
    SELECT lobbys.admin_id FROM bingo.lobbys
    WHERE lobbys.admin_id = players.id
);*/
