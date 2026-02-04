import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../App';
import {
  MessageCircle,
  Heart,
  Share2,
  Send,
  Filter,
  Plus,
  Sparkles,
  Users,
  TrendingUp,
  Award
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'Tout', icon: Sparkles },
  { id: 'tips', label: 'Astuces', icon: TrendingUp },
  { id: 'wins', label: 'Victoires', icon: Award },
  { id: 'support', label: 'Soutien', icon: Heart },
  { id: 'questions', label: 'Questions', icon: MessageCircle },
];

// Données mock pour la démo
const MOCK_POSTS = [
  {
    id: '1',
    username: 'Marie_Focus',
    content: '🎉 Premier mois à utiliser la technique Pomodoro ! J\'ai réussi à terminer mon projet en avance pour la première fois de ma vie. Merci à cette communauté pour le soutien !',
    category: 'wins',
    likes: 24,
    replies: 5,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2',
    username: 'Alex_TDAH',
    content: 'Astuce qui m\'aide beaucoup : je mets TOUT dans mon calendrier, même les pauses. Mon cerveau a besoin de voir que c\'est "autorisé" de se reposer 😅',
    category: 'tips',
    likes: 42,
    replies: 12,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: '3',
    username: 'Léa_Creative',
    content: 'Journée difficile aujourd\'hui... Mon cerveau refuse de coopérer. Quelqu\'un a des conseils pour ces jours où rien ne fonctionne ?',
    category: 'support',
    likes: 18,
    replies: 23,
    created_at: new Date(Date.now() - 14400000).toISOString(),
  },
];

const Community = () => {
  const { user } = useUser();
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newPost, setNewPost] = useState('');
  const [showNewPost, setShowNewPost] = useState(false);
  const [postCategory, setPostCategory] = useState('tips');

  const filteredPosts = selectedCategory === 'all'
    ? posts
    : posts.filter(p => p.category === selectedCategory);

  const handleSubmitPost = () => {
    if (!newPost.trim()) return;

    const post = {
      id: Date.now().toString(),
      username: user?.email?.split('@')[0] || 'Anonyme',
      content: newPost,
      category: postCategory,
      likes: 0,
      replies: 0,
      created_at: new Date().toISOString(),
    };

    setPosts([post, ...posts]);
    setNewPost('');
    setShowNewPost(false);
  };

  const handleLike = (postId) => {
    setPosts(posts.map(p =>
      p.id === postId ? { ...p, likes: p.likes + 1 } : p
    ));
  };

  const formatTimeAgo = (dateString) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'À l\'instant';
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${Math.floor(hours / 24)}j`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-4 md:p-8"
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-white mb-2">
              Communauté 💜
            </h1>
            <p className="text-neutral-500">Ensemble, on est plus forts</p>
          </div>
          <button
            onClick={() => setShowNewPost(true)}
            className="btn-primary gap-2"
            data-testid="new-post-btn"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Partager</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-primary-500" />
            <p className="text-lg font-bold text-neutral-900 dark:text-white">1.2k</p>
            <p className="text-xs text-neutral-500">Membres</p>
          </div>
          <div className="card p-4 text-center">
            <MessageCircle className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <p className="text-lg font-bold text-neutral-900 dark:text-white">{posts.length}</p>
            <p className="text-xs text-neutral-500">Posts</p>
          </div>
          <div className="card p-4 text-center">
            <Heart className="w-6 h-6 mx-auto mb-2 text-pink-500" />
            <p className="text-lg font-bold text-neutral-900 dark:text-white">
              {posts.reduce((sum, p) => sum + p.likes, 0)}
            </p>
            <p className="text-xs text-neutral-500">Likes</p>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {CATEGORIES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedCategory(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                selectedCategory === id
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Posts */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="card p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white font-bold">
                    {post.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-neutral-900 dark:text-white">
                        {post.username}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {formatTimeAgo(post.created_at)}
                      </span>
                    </div>
                    <p className="text-neutral-600 dark:text-neutral-300 mb-3">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleLike(post.id)}
                        className="flex items-center gap-1 text-neutral-500 hover:text-pink-500 transition-colors"
                      >
                        <Heart className="w-4 h-4" />
                        <span className="text-sm">{post.likes}</span>
                      </button>
                      <button className="flex items-center gap-1 text-neutral-500 hover:text-primary-500 transition-colors">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm">{post.replies}</span>
                      </button>
                      <button className="flex items-center gap-1 text-neutral-500 hover:text-primary-500 transition-colors">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* New Post Modal */}
        <AnimatePresence>
          {showNewPost && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                onClick={() => setShowNewPost(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 rounded-t-3xl z-50 p-6 pb-safe"
              >
                <h3 className="font-display font-semibold text-lg text-neutral-900 dark:text-white mb-4">
                  Partager avec la communauté
                </h3>
                
                {/* Category selector */}
                <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
                  {CATEGORIES.filter(c => c.id !== 'all').map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setPostCategory(id)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        postCategory === id
                          ? 'bg-primary-500 text-white'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Partagez une astuce, une victoire, ou demandez du soutien..."
                  className="input min-h-[120px] resize-none mb-4"
                  data-testid="new-post-input"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowNewPost(false)}
                    className="btn-secondary flex-1"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSubmitPost}
                    disabled={!newPost.trim()}
                    className="btn-primary flex-1 gap-2"
                    data-testid="submit-post-btn"
                  >
                    <Send className="w-4 h-4" />
                    Publier
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Community;
