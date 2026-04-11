import { LocalNotifications } from '@capacitor/local-notifications'

const dailyMessages = {
  0: 'A new week begins. What is God speaking to you today? 🙏', // Sunday
  1: 'Start your week anchored. Open your journal and meet with God. ✝️', // Monday
  2: 'God is faithful. Take 5 minutes to reflect and pray today. 🕊️', // Tuesday
  3: 'Midweek check-in — where have you seen God move this week? 🔥', // Wednesday
  4: 'You are not alone. Bring your burdens to God in prayer today. 🙌', // Thursday
  5: 'End your week with gratitude. What has God done for you? 💛', // Friday
  6: 'Rest in His presence today. Open your Bible and be still. 📖', // Saturday
}

export async function scheduleDaily() {
  try {
    // Cancel all previously scheduled notifications to avoid duplicates
    await LocalNotifications.cancel()
    
    // Schedule notifications for each day of the week
    const notifications = []
    
    for (let day = 0; day < 7; day++) {
      const now = new Date()
      const scheduledDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + day, // Schedule for each day
        8, // 8 AM
        0, // 0 minutes
        0 // 0 seconds
      )
      
      // If the scheduled time has already passed today, schedule for next week
      if (scheduledDate <= now) {
        scheduledDate.setDate(scheduledDate.getDate() + 7)
      }
      
      notifications.push({
        id: day + 1, // Unique ID for each day (1-7)
        title: 'AbidingAnchor 🕊️',
        body: dailyMessages[day],
        schedule: {
          at: scheduledDate,
          repeats: true,
          every: 'day',
        },
        sound: 'default',
        smallIcon: 'ic_stat_icon_config_sample',
        largeIcon: 'ic_launcher',
        extra: {
          route: '/journal', // Opens to Journal screen when tapped
        },
      })
    }
    
    await LocalNotifications.schedule({
      notifications,
    })
    
    console.log('Daily notifications scheduled successfully')
  } catch (error) {
    console.error('Error scheduling daily notifications:', error)
  }
}

export async function requestPermission() {
  try {
    const permissionStatus = await LocalNotifications.requestPermissions()
    console.log('Notification permission:', permissionStatus.display)
    return permissionStatus.display === 'granted'
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return false
  }
}
