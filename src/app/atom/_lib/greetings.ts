const MORNING = [
  "Good morning, {name}.", "Morning, {name}.", "Rise and shine, {name}.", "A fresh start is yours, {name}.", "You are ready for today, {name}.",
  "Start steady, {name}.", "New day, new momentum, {name}.", "Your morning is waiting, {name}.", "Make today count, {name}.", "Good morning and good luck, {name}.",
  "The day is yours, {name}.", "Begin with confidence, {name}.", "You have got this morning, {name}.", "Welcome to a brand new day, {name}.", "Take on today, {name}.",
  "Your next win starts now, {name}.", "Bright start, {name}.", "Let us make progress today, {name}.", "Good morning, future legend, {name}.", "Show today what you can do, {name}.",
  "A clear mind and a new day, {name}.", "You are off to a strong start, {name}.", "Good morning, keep moving forward, {name}.", "Today has room for something great, {name}.", "Start small and go far, {name}.",
  "Your day is just getting started, {name}.", "Good morning, stay curious, {name}.", "Fresh energy for you, {name}.", "Make space for a great day, {name}.", "You can set the tone today, {name}.",
  "Good morning, one step at a time, {name}.", "A strong day begins here, {name}.", "You are building something good, {name}.", "Good morning, trust your pace, {name}.", "Today is a clean page, {name}.",
  "Start with what matters, {name}.", "Good morning, bring your best effort, {name}.", "There is plenty of time to make progress, {name}.", "Good morning, your goals are ready, {name}.", "Keep your momentum, {name}.",
  "Today is yours to shape, {name}.", "Good morning, stay focused and kind, {name}.", "A little progress goes a long way, {name}.", "Good morning, let us get started, {name}.", "You bring the spark today, {name}.",
  "Good morning, keep your eyes on the next step, {name}.", "The best part of today is ahead, {name}.", "Good morning, make it a thoughtful one, {name}.", "You are ready for a productive day, {name}.", "Good morning, go make some progress, {name}.",
];

const AFTERNOON = [
  "Good afternoon, {name}.", "Afternoon, {name}.", "You are doing well, {name}.", "Keep the day moving, {name}.", "Your afternoon momentum is here, {name}.",
  "Good afternoon, keep going, {name}.", "You still have time to make progress, {name}.", "Midday check in, {name}.", "Stay with it, {name}.", "Good afternoon, one task at a time, {name}.",
  "The day is still yours, {name}.", "Keep your focus, {name}.", "Good afternoon, you are on your way, {name}.", "A productive afternoon starts now, {name}.", "Keep building, {name}.",
  "Good afternoon, take the next step, {name}.", "You have momentum, {name}.", "Make the rest of today count, {name}.", "Good afternoon, stay curious, {name}.", "Your next win is close, {name}.",
  "Keep your rhythm, {name}.", "Good afternoon, finish strong, {name}.", "There is still room for a great day, {name}.", "Keep moving with purpose, {name}.", "Good afternoon, make progress your priority, {name}.",
  "You are making it happen, {name}.", "Good afternoon, keep your plans in reach, {name}.", "A little more progress, {name}.", "Your focus can carry you far, {name}.", "Good afternoon, stay steady, {name}.",
  "The afternoon is yours, {name}.", "Good afternoon, keep showing up, {name}.", "You have got plenty left in the tank, {name}.", "One good choice can shape the rest of the day, {name}.", "Good afternoon, keep your pace, {name}.",
  "Your work is adding up, {name}.", "Good afternoon, take a breath and continue, {name}.", "Keep your eyes on what matters, {name}.", "A strong finish starts now, {name}.", "Good afternoon, you can do this, {name}.",
  "Make this hour useful, {name}.", "Good afternoon, keep your confidence, {name}.", "The next step is enough for now, {name}.", "Keep going, your future self will thank you, {name}.", "Good afternoon, stay in motion, {name}.",
  "You are closer than you think, {name}.", "Good afternoon, keep the good energy, {name}.", "Let us make the rest of today count, {name}.", "A focused afternoon is a powerful thing, {name}.", "Good afternoon, finish what matters most, {name}.",
];

const EVENING = [
  "Good evening, {name}.", "Evening, {name}.", "You made it to the evening, {name}.", "Wind down with purpose, {name}.", "Good evening, take stock of your progress, {name}.",
  "The evening is yours, {name}.", "Good evening, finish gently and well, {name}.", "You have done a lot today, {name}.", "A calm evening can set up a strong tomorrow, {name}.", "Good evening, keep your balance, {name}.",
  "Close out today with care, {name}.", "Good evening, celebrate a little progress, {name}.", "You are doing better than you think, {name}.", "Evening check in, {name}.", "Good evening, choose your next step wisely, {name}.",
  "The day is winding down, {name}.", "Good evening, your effort matters, {name}.", "Make room for rest, {name}.", "Good evening, keep what worked and release the rest, {name}.", "You can end today proud, {name}.",
  "Good evening, take a moment for yourself, {name}.", "A thoughtful evening is time well spent, {name}.", "You are allowed to slow down, {name}.", "Good evening, tomorrow can wait a little, {name}.", "End the day on your terms, {name}.",
  "Good evening, keep your goals close, {name}.", "You showed up today, {name}.", "The evening is a fresh chance to reset, {name}.", "Good evening, breathe and recharge, {name}.", "A steady finish is still a finish, {name}.",
  "Good evening, notice the wins, {name}.", "Let today teach you something useful, {name}.", "Good evening, protect your peace, {name}.", "You can be proud of the effort, {name}.", "The next day will come, {name}.",
  "Good evening, close one loop at a time, {name}.", "Rest is part of progress, {name}.", "Good evening, keep things simple, {name}.", "You have earned a slower moment, {name}.", "End today with a clear mind, {name}.",
  "Good evening, your pace is valid, {name}.", "A quiet reset can be powerful, {name}.", "Good evening, take care of tomorrow's you, {name}.", "You are finishing strong in your own way, {name}.", "Good evening, let the day settle, {name}.",
  "Make tonight a good landing, {name}.", "Good evening, keep your perspective, {name}.", "You have made progress today, {name}.", "Good evening, rest well when you are ready, {name}.", "The day is complete enough, {name}.",
];

const LATE_NIGHT = [
  "Late night check in, {name}.", "You are up late, {name}.", "Good night when you are ready, {name}.", "The quiet hours are here, {name}.", "Late night thoughts, {name}.",
  "You can call it a day, {name}.", "Rest is waiting for you, {name}.", "Late night reminder: you did enough today, {name}.", "Keep tonight gentle, {name}.", "The world can wait until morning, {name}.",
  "Good night, {name}.", "Let your mind settle, {name}.", "Late night calm is yours, {name}.", "Tomorrow is another chance, {name}.", "Put the day down for now, {name}.",
  "You can rest without earning it, {name}.", "Late night, take a quiet breath, {name}.", "Sleep is part of the plan, {name}.", "Good night, protect your energy, {name}.", "You are allowed to pause, {name}.",
  "The late hours are for resetting, {name}.", "Good night, tomorrow can start later, {name}.", "Close the day softly, {name}.", "Late night kindness for yourself, {name}.", "Rest well, {name}.",
  "You have carried enough for one day, {name}.", "Late night check: breathe, {name}.", "Good night, leave the rest for tomorrow, {name}.", "A quiet finish is a good finish, {name}.", "Let sleep do some of the work, {name}.",
  "Late night, be gentle with your thoughts, {name}.", "You can start again after rest, {name}.", "Good night, your goals are still there tomorrow, {name}.", "Settle in, {name}.", "The best next step may be sleep, {name}.",
  "Late night peace to you, {name}.", "Good night, your effort counts, {name}.", "Time to recharge, {name}.", "You can stop striving for tonight, {name}.", "Late night reset, {name}.",
  "Good night, keep tomorrow simple, {name}.", "The day is done enough, {name}.", "Let the quiet help you, {name}.", "Late night, take care of yourself, {name}.", "Rest now and return refreshed, {name}.",
  "Good night, give yourself credit, {name}.", "Your next chapter can wait until morning, {name}.", "Late night reminder: you are doing okay, {name}.", "Unplug gently, {name}.", "Good night, sleep well, {name}.",
];

const ANY_TIME = [
  "Hello, {name}.", "Welcome back, {name}.", "Glad you are here, {name}.", "Good to see you, {name}.", "You are right where you need to be, {name}.",
  "Let us check in, {name}.", "Your workspace is ready, {name}.", "Keep being you, {name}.", "You bring good energy, {name}.", "One step at a time, {name}.",
  "You are capable of great things, {name}.", "Keep your goals in view, {name}.", "Your effort matters, {name}.", "You have a plan, {name}.", "Stay true to your pace, {name}.",
  "A little focus can go far, {name}.", "You are making progress, {name}.", "Keep your curiosity alive, {name}.", "Your next step is waiting, {name}.", "You can handle today, {name}.",
  "Keep your confidence close, {name}.", "You are building momentum, {name}.", "Your work has value, {name}.", "Stay focused on what matters, {name}.", "You can make room for good things, {name}.",
  "You are allowed to begin again, {name}.", "Keep going at your own pace, {name}.", "Your future self is cheering you on, {name}.", "You are doing meaningful work, {name}.", "Make the next choice count, {name}.",
  "You have more options than you think, {name}.", "Keep a clear head, {name}.", "Your goals are worth the effort, {name}.", "Show up for yourself, {name}.", "You can find your rhythm, {name}.",
  "Keep your priorities close, {name}.", "You are learning every day, {name}.", "Take the next useful step, {name}.", "You can make today meaningful, {name}.", "Your perspective matters, {name}.",
  "Keep your plans flexible, {name}.", "You are stronger with practice, {name}.", "Your attention is powerful, {name}.", "You can choose what comes next, {name}.", "Keep making steady progress, {name}.",
  "Your best effort is enough to start, {name}.", "You are worth the time you invest, {name}.", "Keep your eyes on the horizon, {name}.", "There is always a next step, {name}.", "You have got this, {name}.",
];

function dayNumber(date: Date): number {
  return Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86400000);
}

export function dashboardGreeting(name: string, date = new Date()): string {
  const hour = date.getHours();
  const phrases = [...(hour < 5 || hour >= 23 ? LATE_NIGHT : hour < 12 ? MORNING : hour < 17 ? AFTERNOON : EVENING), ...ANY_TIME];
  return phrases[Math.abs(dayNumber(date)) % phrases.length].replace("{name}", name.toUpperCase());
}
