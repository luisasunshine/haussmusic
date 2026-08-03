// Plays and likes are recorded on individual songs/episodes. A release or
// podcast card represents all of its tracks, so expose their combined metrics.
export function getReleaseMetrics(release, songs = []) {
  const tracks = songs.filter((song) =>
    song.album === release.title && (
      song.artist === release.artist ||
      (release.artist_id && song.artist_id === release.artist_id)
    )
  );

  if (tracks.length === 0) {
    return { plays: release.plays || 0, likes: release.likes || 0 };
  }

  return tracks.reduce(
    (metrics, song) => ({
      plays: metrics.plays + (song.plays || 0),
      likes: metrics.likes + (song.likes || 0),
    }),
    { plays: 0, likes: 0 },
  );
}
