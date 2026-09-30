import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Users, Loader2, Mail, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { schoolsApi } from '@/api/schools';
import { studentsApi } from '@/api/students';
import { toast } from '@/hooks/use-toast';

interface Class {
  id: number;
  name: string;
  grade_level: number;
}

interface Student {
  id: number;
  student_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  email?: string;
  phone?: string;
  address?: string;
  class_assigned: number;
}

const TeacherStudents = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedClass, setSelectedClass] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [selectedClass, searchQuery, students]);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      const [classesData, studentsData] = await Promise.all([
        schoolsApi.getClasses(),
        studentsApi.getStudents(),
      ]);

      const classesArray = Array.isArray(classesData) ? classesData : (classesData.results || []);
      const studentsArray = Array.isArray(studentsData) ? studentsData : (studentsData.results || []);

      // Filter classes where this teacher is assigned
      const myClasses = classesArray.filter((c: any) => c.class_teacher_user === user.id);
      setClasses(myClasses);

      // Get students in teacher's classes
      const myClassIds = myClasses.map((c: any) => c.id);
      const myStudents = studentsArray.filter((s: any) => myClassIds.includes(s.class_assigned));
      setStudents(myStudents);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = [...students];

    // Filter by class
    if (selectedClass !== 'all') {
      filtered = filtered.filter(s => s.class_assigned.toString() === selectedClass);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.first_name.toLowerCase().includes(query) ||
        s.last_name.toLowerCase().includes(query) ||
        s.student_number.toLowerCase().includes(query)
      );
    }

    setFilteredStudents(filtered);
  };

  const getClassName = (classId: number): string => {
    const cls = classes.find(c => c.id === classId);
    return cls ? `${cls.name} - Grade ${cls.grade_level}` : 'Unknown';
  };

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-green-800">My Students</h1>
              <p className="text-sm text-gray-600">View students in your classes</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter Students</CardTitle>
            <CardDescription>Search and filter students by class</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or student number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name} - Grade {cls.grade_level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Students ({filteredStudents.length})
            </CardTitle>
            <CardDescription>
              {selectedClass === 'all' 
                ? 'All students in your classes' 
                : `Students in ${classes.find(c => c.id.toString() === selectedClass)?.name}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No students found.</p>
                {searchQuery && <p className="text-sm mt-2">Try adjusting your search criteria.</p>}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredStudents.map((student) => (
                  <Card key={student.id} className="hover:shadow-lg transition">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {student.first_name} {student.last_name}
                          </CardTitle>
                          <CardDescription>{student.student_number}</CardDescription>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          student.gender === 'M' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                        }`}>
                          {student.gender === 'M' ? 'Male' : 'Female'}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Users className="h-4 w-4" />
                          <span>{getClassName(student.class_assigned)}</span>
                        </div>
                        
                        <div className="text-gray-600">
                          <span className="font-medium">Age:</span> {calculateAge(student.date_of_birth)} years
                        </div>
                        
                        {student.email && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="h-4 w-4" />
                            <span className="text-xs truncate">{student.email}</span>
                          </div>
                        )}
                        
                        {student.phone && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="h-4 w-4" />
                            <span className="text-xs">{student.phone}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TeacherStudents;
