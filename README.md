# Comprehensive Guide: Deploying React and Spring Boot Applications to Google Kubernetes Engine (GKE)

## Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Google Cloud Platform Setup](#google-cloud-platform-setup)
4. [Project Structure](#project-structure)
5. [Local Development Setup](#local-development-setup)
6. [Docker Configuration](#docker-configuration)
7. [Google Kubernetes Engine (GKE) Setup](#google-kubernetes-engine-gke-setup)
8. [Deployment Process](#deployment-process)
9. [Monitoring and Maintenance](#monitoring-and-maintenance)
10. [Troubleshooting](#troubleshooting)
11. [Cleanup](#cleanup)
12. [Best Practices](#best-practices)
13. [Detailed Deployment Process Log](#detailed-deployment-process-log)

## Introduction

This guide provides step-by-step instructions for deploying a full-stack application consisting of a React frontend and Spring Boot backend to Google Kubernetes Engine (GKE). The application uses a microservices architecture where the frontend and backend are deployed as separate containers.

### Key Components:
- Frontend: React application (TypeScript)
- Backend: Spring Boot REST API
- Container Orchestration: Kubernetes (GKE)
- Container Registry: Google Container Registry (GCR)
- Load Balancing: GKE LoadBalancer

## Prerequisites

### Required Software
1. **Google Cloud SDK**
   - Download from: https://cloud.google.com/sdk/docs/install
   - Verify installation: `gcloud --version`

2. **Docker Desktop**
   - Download from: https://www.docker.com/products/docker-desktop
   - Verify installation: `docker --version`

3. **kubectl**
   - Usually installed with Google Cloud SDK
   - Verify installation: `kubectl version`

4. **Node.js and npm**
   - Download from: https://nodejs.org/
   - Recommended version: Node.js 18.x or later
   - Verify installation: 
     ```bash
     node --version
     npm --version
     ```

5. **Java Development Kit (JDK)**
   - Download from: https://adoptium.net/
   - Required version: JDK 17
   - Verify installation: `java -version`

6. **Maven**
   - Download from: https://maven.apache.org/
   - Verify installation: `mvn -version`

### Required Accounts
1. Google Cloud Platform account with billing enabled
2. Sufficient permissions (Owner or Editor role)

## Google Cloud Platform Setup

### 1. Initial Setup
```bash
# Install Google Cloud SDK (if not already installed)
brew install google-cloud-sdk   # For macOS

# Initialize Google Cloud SDK
gcloud init

# Authenticate with Google Cloud
gcloud auth login

# Set your project ID
gcloud config set project [YOUR_PROJECT_ID]

# Enable required APIs
gcloud services enable container.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 2. Configure Docker with GCP
```bash
# Configure Docker to use Google Cloud as a container registry
gcloud auth configure-docker
```

## Project Structure
```
react-spring-gke/
├── frontend/                 # React application
│   ├── src/                 # Source files
│   ├── public/              # Static files
│   ├── package.json         # npm dependencies
│   ├── Dockerfile          # Frontend container configuration
│   └── nginx.conf          # Nginx configuration for production
├── backend/                 # Spring Boot application
│   ├── src/                # Source files
│   ├── pom.xml             # Maven dependencies
│   └── Dockerfile         # Backend container configuration
├── k8s/                    # Kubernetes manifests
│   ├── frontend-deployment.yaml
│   └── backend-deployment.yaml
└── README.md
```

## Local Development Setup

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

### Backend Setup
```bash
cd backend

# Build the application
mvn clean install

# Run the application
mvn spring-boot:run
```

## Docker Configuration

### Frontend Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Backend Dockerfile
```dockerfile
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Building and Pushing Docker Images
```bash
# Frontend
cd frontend
docker build -t gcr.io/[PROJECT_ID]/frontend:latest .
docker push gcr.io/[PROJECT_ID]/frontend:latest

# Backend
cd ../backend
docker build -t gcr.io/[PROJECT_ID]/backend:latest .
docker push gcr.io/[PROJECT_ID]/backend:latest
```

## Google Kubernetes Engine (GKE) Setup

### 1. Create a GKE Cluster
```bash
gcloud container clusters create react-spring-cluster \
    --num-nodes=2 \
    --zone=us-central1-a \
    --machine-type=e2-medium \
    --enable-autoscaling \
    --min-nodes=2 \
    --max-nodes=4
```

### 2. Get Cluster Credentials
```bash
gcloud container clusters get-credentials react-spring-cluster --zone=us-central1-a
```

### 3. Install GKE Auth Plugin (if needed)
```bash
gcloud components install gke-gcloud-auth-plugin
```

## Deployment Process

### 1. Kubernetes Manifests

#### Frontend Deployment (k8s/frontend-deployment.yaml)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: gcr.io/[PROJECT_ID]/frontend:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: frontend
```

#### Backend Deployment (k8s/backend-deployment.yaml)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: gcr.io/[PROJECT_ID]/backend:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  type: ClusterIP
  ports:
  - port: 8080
    targetPort: 8080
  selector:
    app: backend
```

### 2. Deploy Applications
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

# Verify deployments
kubectl get deployments
kubectl get pods
kubectl get services
```

### 3. Access the Application
```bash
# Get the external IP of the frontend service
kubectl get service frontend-service
```

## Monitoring and Maintenance

### 1. View Logs
```bash
# View frontend logs
kubectl logs -l app=frontend

# View backend logs
kubectl logs -l app=backend
```

### 2. Scale Deployments
```bash
# Scale frontend
kubectl scale deployment frontend --replicas=3

# Scale backend
kubectl scale deployment backend --replicas=3
```

### 3. Update Deployments
```bash
# Update images
kubectl set image deployment/frontend frontend=gcr.io/[PROJECT_ID]/frontend:new-version
kubectl set image deployment/backend backend=gcr.io/[PROJECT_ID]/backend:new-version

# Restart deployments
kubectl rollout restart deployment/frontend
kubectl rollout restart deployment/backend
```

## Troubleshooting

### Common Issues and Solutions

1. **Image Pull Errors**
   ```bash
   # Check pod status
   kubectl describe pod [POD_NAME]
   
   # Verify GCR authentication
   gcloud auth configure-docker
   ```

2. **Service Connection Issues**
   ```bash
   # Check service endpoints
   kubectl get endpoints
   
   # Verify service discovery
   kubectl exec [POD_NAME] -- curl backend-service:8080
   ```

3. **Pod Startup Issues**
   ```bash
   # Check pod logs
   kubectl logs [POD_NAME]
   
   # Check pod events
   kubectl describe pod [POD_NAME]
   ```

## Cleanup

### 1. Delete Kubernetes Resources
```bash
# Delete services and deployments
kubectl delete -f k8s/frontend-deployment.yaml
kubectl delete -f k8s/backend-deployment.yaml
```

### 2. Delete GKE Cluster
```bash
gcloud container clusters delete react-spring-cluster --zone=us-central1-a
```

### 3. Clean up Container Images
```bash
# Delete container images from GCR
gcloud container images delete gcr.io/[PROJECT_ID]/frontend:latest --force-delete-tags
gcloud container images delete gcr.io/[PROJECT_ID]/backend:latest --force-delete-tags
```

## Best Practices

1. **Security**
   - Use minimal base images
   - Implement HTTPS
   - Use Kubernetes secrets for sensitive data
   - Regular security updates

2. **Performance**
   - Implement health checks
   - Set resource requests and limits
   - Use horizontal pod autoscaling
   - Configure liveness and readiness probes

3. **Maintenance**
   - Use semantic versioning for images
   - Implement rolling updates
   - Regular backup of application data
   - Monitor resource usage

4. **Cost Optimization**
   - Use preemptible nodes when possible
   - Implement autoscaling
   - Regular cleanup of unused resources
   - Monitor billing and set up alerts

## Detailed Deployment Process Log

This section documents the exact steps we followed to deploy our application to GKE.

### 1. Initial Setup and Configuration

1. **Install Required Tools**
   ```bash
   # Install Google Cloud SDK
   brew install google-cloud-sdk
   
   # Install GKE auth plugin
   gcloud components install gke-gcloud-auth-plugin
   ```

2. **Configure Google Cloud**
   ```bash
   # Initialize and authenticate
   gcloud init
   gcloud auth login
   
   # Set project
   gcloud config set project gcp-demo-app-2024
   
   # Configure Docker authentication
   gcloud auth configure-docker
   ```

### 2. Building the Applications

1. **Frontend Application**
   - Created React application with TypeScript
   - Implemented API call to backend service
   - Created Dockerfile for multi-stage build
   - Added nginx configuration for routing

   Key files:
   ```typescript
   // App.tsx
   function App() {
     const [message, setMessage] = useState('');
   
     useEffect(() => {
       fetch('/api/hello')
         .then(response => response.text())
         .then(data => setMessage(data))
         .catch(error => console.error('Error:', error));
     }, []);
   
     return (
       <div className="App">
         <header className="App-header">
           <h1>React + Spring Boot Demo</h1>
           <p>{message || 'Loading...'}</p>
         </header>
       </div>
     );
   }
   ```

   ```nginx
   # nginx.conf
   server {
       listen 80;
       server_name localhost;
       root /usr/share/nginx/html;
       index index.html;
   
       location / {
           try_files $uri $uri/ /index.html;
       }
   
       location /api {
           proxy_pass http://backend-service:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

2. **Backend Application**
   - Created Spring Boot REST API
   - Implemented hello endpoint
   - Created Dockerfile for Java application

   Key files:
   ```java
   @RestController
   public class HelloController {
       @GetMapping("/api/hello")
       public String hello() {
           return "Hello from Spring Boot!";
       }
   }
   ```

### 3. Docker Image Building and Pushing

1. **Build and Push Frontend Image**
   ```bash
   cd frontend
   docker build -t gcr.io/gcp-demo-app-2024/frontend:latest .
   docker push gcr.io/gcp-demo-app-2024/frontend:latest
   ```

2. **Build and Push Backend Image**
   ```bash
   cd backend
   docker build -t gcr.io/gcp-demo-app-2024/backend:latest .
   docker push gcr.io/gcp-demo-app-2024/backend:latest
   ```

### 4. GKE Cluster Setup

1. **Create Cluster**
   ```bash
   gcloud container clusters create react-spring-cluster \
       --num-nodes=2 \
       --zone=us-central1-a
   ```

2. **Get Cluster Credentials**
   ```bash
   gcloud container clusters get-credentials react-spring-cluster --zone=us-central1-a
   ```

### 5. Kubernetes Deployment

1. **Deploy Backend**
   ```bash
   kubectl apply -f k8s/backend-deployment.yaml
   ```

2. **Deploy Frontend**
   ```bash
   kubectl apply -f k8s/frontend-deployment.yaml
   ```

3. **Verify Deployments**
   ```bash
   kubectl get pods
   kubectl get services
   ```

### 6. Troubleshooting Steps

1. **Frontend 404 Issue**
   - Problem: Frontend returning 404 errors
   - Solution: Added custom nginx configuration to handle React routing
   ```bash
   # Update nginx configuration
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   
   # Rebuild and redeploy frontend
   docker build -t gcr.io/gcp-demo-app-2024/frontend:latest .
   docker push gcr.io/gcp-demo-app-2024/frontend:latest
   kubectl rollout restart deployment/frontend
   ```

2. **Backend Connection**
   - Verified backend service is running:
   ```bash
   kubectl get services backend-service
   ```
   - Confirmed backend pods are healthy:
   ```bash
   kubectl get pods -l app=backend
   kubectl logs -l app=backend
   ```

### 7. Final Configuration

1. **Services**
   - Frontend Service (LoadBalancer): External IP `35.202.104.164`
   - Backend Service (ClusterIP): Internal endpoint `backend-service:8080`

2. **Deployment Status**
   ```bash
   $ kubectl get pods
   NAME                        READY   STATUS    RESTARTS   AGE
   backend-869f9bd7b9-ddpx2    1/1     Running   0          37s
   backend-869f9bd7b9-dgk5f    1/1     Running   0          37s
   frontend-7dbf856bfc-8l4xw   1/1     Running   0          8s
   frontend-7dbf856bfc-s8xjt   1/1     Running   0          8s
   ```

### 8. Verification

1. **Access Application**
   - Frontend accessible at: http://35.202.104.164
   - Backend accessible internally at: http://backend-service:8080

2. **Monitoring**
   ```bash
   # Monitor pods
   kubectl get pods -w
   
   # Check logs
   kubectl logs -l app=frontend
   kubectl logs -l app=backend
   ```

### 9. Lessons Learned

1. **Configuration Best Practices**
   - Always use custom nginx configuration for React applications
   - Set up proper health checks
   - Configure appropriate resource limits

2. **Troubleshooting Tips**
   - Use `kubectl describe pod` for detailed pod information
   - Check logs using `kubectl logs`
   - Verify service discovery using `kubectl exec`

3. **Performance Optimization**
   - Use multi-stage Docker builds
   - Implement proper caching strategies
   - Configure appropriate replica counts

## Additional Resources

1. [Google Kubernetes Engine Documentation](https://cloud.google.com/kubernetes-engine/docs)
2. [Kubernetes Documentation](https://kubernetes.io/docs/home/)
3. [Docker Documentation](https://docs.docker.com/)
4. [Spring Boot Documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/)
5. [React Documentation](https://reactjs.org/docs/getting-started.html)
