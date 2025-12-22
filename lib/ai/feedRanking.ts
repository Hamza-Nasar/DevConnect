// AI-powered feed ranking algorithm
// Uses engagement metrics, user preferences, and recency

interface PostMetrics {
    id: string;
    type?: string;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    viewsCount: number;
    createdAt: Date;
    userId: string;
    hashtags: string[];
    hasCode?: boolean;
    content: string;
}

interface UserPreferences {
    followedUsers: string[];
    likedHashtags: string[];
    interactedUsers: string[];
    mood?: string;
}

export function calculatePostScore(
    post: PostMetrics,
    userPrefs: UserPreferences,
    currentTime: Date = new Date()
): number {
    let score = 0;

    // 1. Engagement Score (35% weight)
    const engagementScore =
        post.likesCount * 1.5 +
        post.commentsCount * 3 +
        post.sharesCount * 5 +
        post.viewsCount * 0.1;
    score += engagementScore * 0.35;

    // 2. Recency Score (25% weight)
    const msSincePost = currentTime.getTime() - post.createdAt.getTime();
    const hoursSincePost = msSincePost / (1000 * 60 * 60);
    // Exponential decay is better for "Advanced" ranking
    const recencyScore = 100 * Math.exp(-hoursSincePost / 24);
    score += recencyScore * 0.25;

    // 3. Social & Relevance Score (20% weight)
    let relevanceScore = 0;
    if (userPrefs.followedUsers.includes(post.userId)) {
        relevanceScore += 50;
    }
    if (userPrefs.interactedUsers.includes(post.userId)) {
        relevanceScore += 30;
    }

    // Hashtag affinity
    const tagMatchCount = post.hashtags.filter(tag => userPrefs.likedHashtags.includes(tag)).length;
    relevanceScore += Math.min(tagMatchCount * 15, 60);

    score += relevanceScore * 0.2;

    // 4. Content Quality & Bonuses (20% weight)
    let qualityScore = 0;

    // Code bonus
    if (post.hasCode) qualityScore += 30;

    // Poll bonus (active polls are engaging)
    if (post.type === "poll") qualityScore += 25;

    // Sentiment alignment (bonus for positive/inspiring content)
    const sentiment = analyzeSentiment(post.content);
    if (sentiment === "positive") qualityScore += 10;

    // Content depth
    const wordCount = post.content.split(/\s+/).length;
    if (wordCount > 50) qualityScore += 20; // Reward meaningful content

    // Mood alignment
    if (userPrefs.mood && post.content.toLowerCase().includes(userPrefs.mood.toLowerCase())) {
        qualityScore += 40;
    }

    score += Math.min(qualityScore, 100) * 0.2;

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







