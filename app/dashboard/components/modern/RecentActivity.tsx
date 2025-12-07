"use client";

const visits = [
    { name: "Esther Howard", role: "Frontend Dev", time: "09:44", img: "https://i.pravatar.cc/150?u=1" },
    { name: "Eleanor Pena", role: "Product Designer", time: "08:54", img: "https://i.pravatar.cc/150?u=2" },
    { name: "Brooklyn Simmons", role: "Project Manager", time: "07:30", img: "https://i.pravatar.cc/150?u=3" },
];

export default function VisitsList() {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-800">Latest Visits</h3>
            </div>

            <div className="space-y-4">
                {visits.map((visit, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <img src={visit.img} alt={visit.name} className="w-10 h-10 rounded-full object-cover" />
                        <div>
                            <p className="text-sm font-bold text-gray-800">{visit.name}</p>
                            <p className="text-xs text-gray-500">{visit.role}</p>
                        </div>
                        <div className="ml-auto text-xs font-medium text-gray-400">
                            Today<br />{visit.time}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
