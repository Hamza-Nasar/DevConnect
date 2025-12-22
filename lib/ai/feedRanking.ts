// AI-powered feed ranking algorithm
// Uses engagement metrics, user preferences, and recency

interface PostMetrics {
    id: string;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    viewsCount: number;
    createdAt: Date;
    userId: string;
    hashtags: string[];
}

interface UserPreferences {
    followedUsers: string[];
    likedHashtags: string[];
    interactedUsers: string[];
}

export function calculatePostScore(
    post: PostMetrics,
    userPrefs: UserPreferences,
    currentTime: Date = new Date()
): number {
    let score = 0;

    // 1. Engagement Score (40% weight)
    const engagementScore =
        post.likesCount * 1 +
        post.commentsCount * 2 +
        post.sharesCount * 3 +
        post.viewsCount * 0.1;
    score += engagementScore * 0.4;

    // 2. Recency Score (30% weight)
    const hoursSincePost = (currentTime.getTime() - post.createdAt.getTime()) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 100 - hoursSincePost * 2); // Decay over time
    score += recencyScore * 0.3;

    // 3. Social Connection Score (20% weight)
    let connectionScore = 0;
    if (userPrefs.followedUsers.includes(post.userId)) {
        connectionScore += 50; // Posts from followed users
    }
    if (userPrefs.interactedUsers.includes(post.userId)) {
        connectionScore += 25; // Posts from users you've interacted with
    }
    score += connectionScore * 0.2;

    // 4. Interest Score (10% weight)
    const interestScore = post.hashtags.reduce((acc, tag) => {
        if (userPrefs.likedHashtags.includes(tag)) {
            return acc + 10;
        }
        return acc;
    }, 0);
    score += Math.min(interestScore, 100) * 0.1;

    return score;
}

export function rankPosts(
    posts: PostMetrics[],
    userPrefs: UserPreferences
): PostMetrics[] {
    const postsWithScores = posts.map((post) => ({
        ...post,
        score: calculatePostScore(post, userPrefs),
    }));

    return postsWithScores
        .sort((a, b) => b.score - a.score)
        .map(({ score, ...post }) => post);
}

// Sentiment analysis (basic implementation)
export function analyzeSentiment(text: string): "positive" | "neutral" | "negative" {
    const positiveWords = ["good", "great", "awesome", "love", "amazing", "excellent", "happy"];
    const negativeWords = ["bad", "terrible", "hate", "awful", "sad", "angry", "disappointed"];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter((word) => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter((word) => lowerText.includes(word)).length;

    if (positiveCount > negativeCount) return "positive";
    if (negativeCount > positiveCount) return "negative";
    return "neutral";
}

// Auto-hashtag suggestions
export function suggestHashtags(content: string): string[] {
    const commonHashtags = [
        "developer", "coding", "programming", "webdev", "javascript", "react",
        "nextjs", "typescript", "nodejs", "ai", "tech", "software", "machinelearning",
        "python", "frontend", "backend", "fullstack", "cloud", "devops", "database",
        "security", "mobile", "ios", "android", "uiux", "design", "agile", "startup",
        "career", "tutorial", "tips", "hacks", "life", "future", "innovation"
    ];

    const lowerContent = content.toLowerCase();

    // Find matching tags
    const matchedTags = commonHashtags.filter((tag) => {
        // Match whole words or part of words if they are long enough
        const regex = new RegExp(`\\b${tag}|${tag}\\b`, 'i');
        return regex.test(lowerContent);
    });

    // Extract existing hashtags
    const existingHashtags = content.match(/#(\w+)/g) || [];
    const existing = existingHashtags.map((h) => h.replace("#", ""));

    // Extract potential hashtags from capitalized words (proper nouns/keywords)
    const capitalWords = content.match(/[A-Z][a-z]+/g) || [];
    const keywords = capitalWords
        .filter(w => w.length > 3 && !["This", "That", "There", "When", "Where", "These"].includes(w))
        .map(w => w.toLowerCase());

    const allSuggestions = [...new Set([...existing, ...matchedTags, ...keywords])];

    return allSuggestions.slice(0, 8);
}







