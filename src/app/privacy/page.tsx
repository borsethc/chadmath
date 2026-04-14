export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-black text-white p-8 md:p-16 font-sans">
            <div className="max-w-3xl mx-auto border border-white/10 rounded-3xl p-8 bg-white/5 backdrop-blur-md">
                <header className="mb-8 border-b border-white/10 pb-6">
                    <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                        Privacy Policy
                    </h1>
                    <p className="text-gray-400 mt-2">Last Updated: {new Date().toLocaleDateString()}</p>
                </header>

                <div className="space-y-6 text-gray-300 leading-relaxed text-sm">
                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">1. Introduction</h2>
                        <p>
                            Welcome to ChadMath. We are committed to protecting the privacy of our students and 
                            maintaining a secure learning environment. This Privacy Policy explains how we collect, 
                            use, and manage information within the ChadMath application.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">2. Information We Collect</h2>
                        <p>
                            ChadMath is designed with student privacy as a priority. We deliberately minimize the amount of data we collect:
                        </p>
                        <ul className="list-disc pl-6 mt-2 space-y-2">
                            <li><strong>Anonymized Identifiers:</strong> We strictly prohibit the collection of student names, email addresses, or personal contact information. Users log in using a generic "Username" or alphanumeric code assigned by their teacher.</li>
                            <li><strong>Performance Data:</strong> We collect mathematical performance metrics, including timestamps of sessions, factors practiced, correct/incorrect response rates, and calculated mastery tiers.</li>
                            <li><strong>Usage Data:</strong> We track total practice time, daily login streaks, and gamification points (XP/Levels) purely to facilitate the learning systems.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">3. How We Use the Information</h2>
                        <p>
                            The data collected is used strictly for educational purposes:
                        </p>
                        <ul className="list-disc pl-6 mt-2 space-y-2">
                            <li>To power the adaptive learning algorithms that recommend specific math factors for practice.</li>
                            <li>To power the localized heatmaps in the Student Dashboard to motivate learning.</li>
                            <li>To provide educators and parents with a statistical "Teacher Dashboard" to monitor automated progress over time.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">4. Data Sharing and Disclosure</h2>
                        <p>
                            <strong>We do not sell, rent, or monetize student data under any circumstances.</strong>
                        </p>
                        <p className="mt-2">
                            Performance data is only accessible to authorized educators utilizing the secure Teacher Dashboard PIN access, and is never shared with third-party marketers or advertisers.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">5. Children's Privacy (COPPA Compliance)</h2>
                        <p>
                            ChadMath is intended for use by K-12 students under the direction of a school or parent. We comply with the Children's Online Privacy Protection Act (COPPA). Because we do not collect names, emails, or personal identifiers, the anonymous performance tracking inherently protects student identity.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">6. Changes to this Policy</h2>
                        <p>
                            We may update this Privacy Policy periodically to reflect changes in our practices or for other operational, legal, or regulatory reasons. 
                        </p>
                    </section>

                    <section className="pt-6 border-t border-white/10">
                        <p className="text-center text-gray-500 italic">
                            If you have any questions regarding this privacy policy, please contact your school administrator or the developer.
                        </p>
                    </section>
                </div>

                <div className="mt-12 text-center">
                    <a href="/" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all">
                        Return to App
                    </a>
                </div>
            </div>
        </div>
    );
}
