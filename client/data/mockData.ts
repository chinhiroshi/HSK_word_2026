import { Word, Video } from "@/types";

export const mockWords: Word[] = [
  {
    id: "1",
    word: "apple",
    translation: "りんご",
    pronunciation: "アップル",
    isMemorized: false,
    videoIds: ["v1", "v2"],
  },
  {
    id: "2",
    word: "book",
    translation: "本",
    pronunciation: "ブック",
    isMemorized: true,
    videoIds: ["v3"],
  },
  {
    id: "3",
    word: "computer",
    translation: "コンピュータ",
    pronunciation: "コンピューター",
    isMemorized: false,
    videoIds: ["v4", "v5"],
  },
  {
    id: "4",
    word: "dog",
    translation: "犬",
    pronunciation: "ドッグ",
    isMemorized: false,
    videoIds: ["v6"],
  },
  {
    id: "5",
    word: "elephant",
    translation: "象",
    pronunciation: "エレファント",
    isMemorized: true,
    videoIds: ["v7", "v8"],
  },
  {
    id: "6",
    word: "flower",
    translation: "花",
    pronunciation: "フラワー",
    isMemorized: false,
    videoIds: ["v9"],
  },
  {
    id: "7",
    word: "garden",
    translation: "庭",
    pronunciation: "ガーデン",
    isMemorized: false,
    videoIds: ["v10"],
  },
  {
    id: "8",
    word: "house",
    translation: "家",
    pronunciation: "ハウス",
    isMemorized: true,
    videoIds: ["v11", "v12"],
  },
  {
    id: "9",
    word: "island",
    translation: "島",
    pronunciation: "アイランド",
    isMemorized: false,
    videoIds: ["v13"],
  },
  {
    id: "10",
    word: "journey",
    translation: "旅",
    pronunciation: "ジャーニー",
    isMemorized: false,
    videoIds: ["v14", "v15"],
  },
];

export const mockVideos: Video[] = [
  { id: "v1", wordId: "1", thumbnailUrl: "sample-thumbnail-1", videoUrl: "", title: "Apple pronunciation" },
  { id: "v2", wordId: "1", thumbnailUrl: "sample-thumbnail-2", videoUrl: "", title: "Apple in context" },
  { id: "v3", wordId: "2", thumbnailUrl: "sample-thumbnail-1", videoUrl: "", title: "Book pronunciation" },
  { id: "v4", wordId: "3", thumbnailUrl: "sample-thumbnail-2", videoUrl: "", title: "Computer basics" },
  { id: "v5", wordId: "3", thumbnailUrl: "sample-thumbnail-1", videoUrl: "", title: "Computer usage" },
  { id: "v6", wordId: "4", thumbnailUrl: "sample-thumbnail-2", videoUrl: "", title: "Dog vocabulary" },
  { id: "v7", wordId: "5", thumbnailUrl: "sample-thumbnail-1", videoUrl: "", title: "Elephant facts" },
  { id: "v8", wordId: "5", thumbnailUrl: "sample-thumbnail-2", videoUrl: "", title: "Elephant sounds" },
  { id: "v9", wordId: "6", thumbnailUrl: "sample-thumbnail-1", videoUrl: "", title: "Flower names" },
  { id: "v10", wordId: "7", thumbnailUrl: "sample-thumbnail-2", videoUrl: "", title: "Garden vocabulary" },
  { id: "v11", wordId: "8", thumbnailUrl: "sample-thumbnail-1", videoUrl: "", title: "House parts" },
  { id: "v12", wordId: "8", thumbnailUrl: "sample-thumbnail-2", videoUrl: "", title: "House description" },
  { id: "v13", wordId: "9", thumbnailUrl: "sample-thumbnail-1", videoUrl: "", title: "Island life" },
  { id: "v14", wordId: "10", thumbnailUrl: "sample-thumbnail-2", videoUrl: "", title: "Journey expressions" },
  { id: "v15", wordId: "10", thumbnailUrl: "sample-thumbnail-1", videoUrl: "", title: "Travel phrases" },
];

export function getVideosForWord(wordId: string): Video[] {
  return mockVideos.filter((v) => v.wordId === wordId);
}
