import React from 'react';
import { MessageSquare, Wallet, Bot, CreditCard, ArrowRight, CheckCircle2, ExternalLink, Mail } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-sm z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">ZapWise</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#products" className="text-gray-600 hover:text-gray-900">Products</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900">How It Works</a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900">Testimonials</a>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Transform Your WhatsApp Experience
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Unlock the power of intelligent messaging with ZapWise's suite of WhatsApp-based applications.
              Enhance your communication, streamline transactions, and boost productivity.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              <button className="border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:border-gray-300 transition">
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Our Products</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <ProductCard
              icon={<MessageSquare className="h-8 w-8 text-blue-600" />}
              title="Antidel"
              description="Never miss a message with our WhatsApp Anti-Delete application"
            />
            <ProductCard
              icon={<Wallet className="h-8 w-8 text-blue-600" />}
              title="Crypto Trading"
              description="Trade cryptocurrencies directly through WhatsApp"
            />
            <ProductCard
              icon={<Bot className="h-8 w-8 text-blue-600" />}
              title="TassGPT"
              description="AI-powered chatbot for intelligent WhatsApp interactions"
            />
            <ProductCard
              icon={<CreditCard className="h-8 w-8 text-blue-600" />}
              title="Payment Links"
              description="Generate and share mobile money payment links instantly"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Sign Up"
              description="Create your ZapWise account in minutes"
            />
            <StepCard
              number="2"
              title="Connect WhatsApp"
              description="Link your WhatsApp account securely"
            />
            <StepCard
              number="3"
              title="Start Using"
              description="Access all features instantly"
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Users Say</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard
              image="https://images.unsplash.com/photo-1494790108377-be9c29b29330"
              name="Sarah Johnson"
              role="Business Owner"
              quote="ZapWise has revolutionized how I handle customer communications. The anti-delete feature is a game-changer!"
            />
            <TestimonialCard
              image="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e"
              name="David Chen"
              role="Crypto Trader"
              quote="Trading crypto through WhatsApp is incredibly convenient. The interface is intuitive and secure."
            />
            <TestimonialCard
              image="https://images.unsplash.com/photo-1438761681033-6461ffad8d80"
              name="Emily Rodriguez"
              role="Marketing Manager"
              quote="TassGPT has helped us automate customer support while maintaining a personal touch."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-600 rounded-2xl p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl mb-8 opacity-90">Join thousands of satisfied users and transform your WhatsApp experience today.</p>
            <div className="flex flex-col md:flex-row justify-center gap-4">
              <input
                type="email"
                placeholder="Enter your email"
                className="px-6 py-4 rounded-lg text-gray-900 w-full md:w-96"
              />
              <button className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition flex items-center justify-center">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <MessageSquare className="h-8 w-8 text-blue-400" />
                <span className="ml-2 text-xl font-bold">ZapWise</span>
              </div>
              <p className="text-gray-400">Transforming WhatsApp for the future.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Products</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Antidel</a></li>
                <li><a href="#" className="hover:text-white">Crypto Trading</a></li>
                <li><a href="#" className="hover:text-white">TassGPT</a></li>
                <li><a href="#" className="hover:text-white">Payment Links</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Connect</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white flex items-center">
                    <ExternalLink className="h-4 w-4 mr-2" /> Twitter
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white flex items-center">
                    <ExternalLink className="h-4 w-4 mr-2" /> LinkedIn
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white flex items-center">
                    <Mail className="h-4 w-4 mr-2" /> Newsletter
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>© 2025 ZapWise. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProductCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
      <button className="mt-4 text-blue-600 font-medium flex items-center">
        Learn More <ArrowRight className="ml-1 h-4 w-4" />
      </button>
    </div>
  );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function TestimonialCard({ image, name, role, quote }: { image: string; name: string; role: string; quote: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <div className="flex items-center mb-4">
        <img src={image} alt={name} className="w-12 h-12 rounded-full object-cover" />
        <div className="ml-4">
          <h4 className="font-semibold">{name}</h4>
          <p className="text-gray-600 text-sm">{role}</p>
        </div>
      </div>
      <p className="text-gray-700">{quote}</p>
      <div className="mt-4 flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <CheckCircle2 key={star} className="h-5 w-5 text-blue-600" />
        ))}
      </div>
    </div>
  );
}

export default App;