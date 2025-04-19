import { View, Text, FlatList, ScrollView } from 'react-native';
import { ChevronRightIcon } from 'react-native-heroicons/outline'
import { useTranslation } from 'react-i18next';

import TaskCard from '@/components/TaskCard';
import NavigationService from '@/navigation/NavigationService'
import Loading from '@/components/ui/Loading';

import { useGetTasks } from '@/hooks/useTasks'

const Task = () => {
  const { t } = useTranslation();
  const { tasks, isLoading, setFetchingListTask } = useGetTasks()

  if (isLoading) {
    return <Loading />
  }

  return (
    <View className="px-4 mb-6">
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex flex-row items-center gap-5">
          <Text className="text-lg font-semibold">{t('dashboard.task', 'Task')}</Text>
          <Text className="text-gray-600 px-2 py-1 rounded-full bg-[#E5E7EB]">{tasks.length}</Text>
        </View>
        <ChevronRightIcon size={20} color="#2E90FA" className="cursor-pointer" onPress={() => NavigationService.navigate('task')} />
      </View>
      <ScrollView>
        <View className="max-h-[500px]">
          <FlatList
            data={tasks}
            keyExtractor={(item, index) => index}
            renderItem={({ item }) => <TaskCard item={item} />}
          />
        </View>
      </ScrollView>
    </View>
  )
}

export default Task