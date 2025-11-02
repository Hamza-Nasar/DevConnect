import { prisma } from "@/lib/prisma";

interface Props {
    params: { username: string };
}

export default async function ProfilePage({ params }: Props) {
    const user = await prisma.user.findUnique({
        where: { username: params.username },
    });

    if (!user) return <div className="text-center mt-10">User not found</div>;

    return (
        <div className="max-w-2xl mx-auto mt-10 text-white">
            <div className="bg-gray-800 p-6 rounded-2xl">
                <img
                    src={user.image || "/default-avatar.png"}
                    alt={user.name}
                    className="w-24 h-24 rounded-full mx-auto"
                />
                <h1 className="text-2xl font-bold mt-4 text-center">{user.name}</h1>
                <p className="text-center text-gray-400">@{user.username}</p>
                <p className="mt-4 text-gray-300">{user.bio || "No bio yet."}</p>
                {user.skills.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                        {user.skills.map((skill) => (
                            <span
                                key={skill}
                                className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-sm"
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
