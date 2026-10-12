export const PODCAST_COMMENT_LIMIT = 15;

const R2_SEASON_TWO_BASE_URL =
  "https://pub-6cccbfda38a24d07867ed6116b4ad012.r2.dev/season-2";

export const SEASON_TWO_EPISODES = [
  {
    id: "season-2-episode-1",
    number: 1,
    title: "Episode 1",
    src: null,
    available: false,
  },
  {
    id: "season-2-episode-2",
    number: 2,
    title: "Episode 2",
    src: `${R2_SEASON_TWO_BASE_URL}/Podcast%202%20Series%202%20%28finished%29%20%281%29.mp4`,
    available: true,
  },
  {
    id: "season-2-episode-3",
    number: 3,
    title: "Episode 3",
    src: null,
    available: false,
  },
  {
    id: "season-2-episode-4",
    number: 4,
    title: "Episode 4",
    src: `${R2_SEASON_TWO_BASE_URL}/Podcast%204%20Series%202%20%28finished%29%20%281%29.mp4`,
    available: true,
  },
  {
    id: "season-2-episode-5",
    number: 5,
    title: "Episode 5",
    src: `${R2_SEASON_TWO_BASE_URL}/Podcast%205%20Series%202%20%28finished%29.mp4`,
    available: true,
  },
] as const;

export type PodcastEpisodeId = (typeof SEASON_TWO_EPISODES)[number]["id"];

export type PodcastComment = {
  id: string;
  body: string;
  createdAt: string;
};

export function isPodcastEpisodeId(value: unknown): value is PodcastEpisodeId {
  return (
    typeof value === "string" &&
    SEASON_TWO_EPISODES.some((episode) => episode.id === value)
  );
}
